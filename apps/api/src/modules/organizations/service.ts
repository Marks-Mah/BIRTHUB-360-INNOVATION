import { getApiConfig } from "@birthub/config";
import {
  Prisma,
  prisma,
  type QuotaResourceType,
  Role,
  SubscriptionStatus,
  withTenantDatabaseContext
} from "@birthub/database";

import { ProblemDetailsError } from "../../lib/problem-details.js";
import { hashPassword } from "../auth/crypto.js";
import { ensurePlanByCode, provisionStripeCustomerForOrganization } from "../billing/service.js";
import { enqueueCrmSync } from "../engagement/queues.js";

type DatabaseClient = {
  organization: {
    findFirst: typeof prisma.organization.findFirst;
  };
};

const bootstrapQuotas: Array<{ limit: number; resourceType: QuotaResourceType }> = [
  { limit: 5_000, resourceType: "API_REQUESTS" },
  { limit: 1_000, resourceType: "AI_PROMPTS" },
  { limit: 2_500, resourceType: "EMAILS_SENT" }
];

function buildAuditCsv(rows: Array<Record<string, unknown>>): string {
  const headers = ["createdAt", "actorId", "action", "entityType", "entityId", "ip", "userAgent"];
  const toCsvCell = (value: unknown): string => {
    if (value === null || value === undefined) {
      return JSON.stringify("");
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return JSON.stringify(value);
    }

    if (typeof value === "bigint") {
      return JSON.stringify(value.toString());
    }

    if (value instanceof Date) {
      return JSON.stringify(value.toISOString());
    }

    return JSON.stringify(JSON.stringify(value));
  };

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => toCsvCell(row[header]))
        .join(",")
    )
  ];

  return lines.join("\n");
}

async function resolveScopedOrganization(
  client: DatabaseClient,
  organizationId: string,
  tenantId: string
) {
  const organization = await client.organization.findFirst({
    where: {
      id: organizationId,
      tenantId
    }
  });

  if (!organization) {
    throw new ProblemDetailsError({
      detail: "The requested organization was not found for the active tenant.",
      status: 404,
      title: "Not Found"
    });
  }

  return organization;
}

// @see ADR-007
export async function createOrganization(input: {
  adminEmail: string;
  adminName: string;
  adminPassword: string;
  name: string;
  requestId: string;
  slug: string;
}) {
  const config = getApiConfig();
  const passwordHash = await hashPassword(
    input.adminPassword,
    config.AUTH_BCRYPT_SALT_ROUNDS
  );
  const primaryDomain = input.adminEmail.includes("@")
    ? input.adminEmail.split("@")[1] ?? null
    : null;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const starterPlan = await ensurePlanByCode("starter", tx);
      const organization = await tx.organization.create({
        data: {
          name: input.name,
          planId: starterPlan.id,
          primaryDomain,
          settings: {
            locale: "pt-BR",
            onboarding: true
          },
          slug: input.slug
        }
      });

      const owner = await tx.user.create({
        data: {
          email: input.adminEmail,
          name: input.adminName,
          passwordHash
        }
      });

      await tx.membership.create({
        data: {
          organizationId: organization.id,
          role: Role.OWNER,
          tenantId: organization.tenantId,
          userId: owner.id
        }
      });

      await tx.userPreference.create({
        data: {
          emailNotifications: true,
          inAppNotifications: true,
          marketingEmails: false,
          organizationId: organization.id,
          pushNotifications: false,
          tenantId: organization.tenantId,
          userId: owner.id
        }
      });

      const stripeCustomerId = await provisionStripeCustomerForOrganization({
        client: tx,
        config,
        email: input.adminEmail,
        name: input.adminName,
        organizationReference: organization.id
      });

      await tx.subscription.create({
        data: {
          currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          organizationId: organization.id,
          planId: starterPlan.id,
          status: SubscriptionStatus.trial,
          stripeCustomerId,
          tenantId: organization.tenantId
        }
      });

      await Promise.all(
        bootstrapQuotas.map((quota) =>
          tx.quotaUsage.create({
            data: {
              limit: quota.limit,
              period: "MONTHLY-2026-03",
              resetAt: new Date("2026-04-01T00:00:00.000Z"),
              resourceType: quota.resourceType,
              tenantId: organization.tenantId
            }
          })
        )
      );

      return {
        organizationId: organization.id,
        ownerUserId: owner.id,
        requestId: input.requestId,
        role: "OWNER" as const,
        slug: organization.slug,
        tenantId: organization.tenantId
      };
    });

    void enqueueCrmSync(config, {
      kind: "company-upsert",
      organizationId: created.organizationId,
      tenantId: created.tenantId
    }).catch(() => undefined);

    return created;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ProblemDetailsError({
        detail: `Organization slug '${input.slug}' is already in use.`,
        status: 409,
        title: "Conflict"
      });
    }

    throw error;
  }
}

export async function listMembersForOrganization(input: {
  cursor?: string;
  organizationId: string;
  take: number;
  tenantId: string;
}) {
  return withTenantDatabaseContext(async (tx) => {
    await resolveScopedOrganization(tx, input.organizationId, input.tenantId);

    const rows = await tx.membership.findMany({
      include: {
        user: true
      },
      orderBy: {
        id: "asc"
      },
      skip: input.cursor ? 1 : 0,
      take: input.take + 1,
      where: {
        organizationId: input.organizationId,
        tenantId: input.tenantId
      },
      ...(input.cursor
        ? {
            cursor: {
              id: input.cursor
            }
          }
        : {})
    });

    return {
      items: rows.slice(0, input.take).map((membership) => ({
        email: membership.user.email,
        id: membership.id,
        name: membership.user.name,
        role: membership.role,
        status: membership.status,
        userId: membership.userId
      })),
      nextCursor: rows.length > input.take ? rows[input.take - 1]?.id ?? null : null
    };
  });
}

export async function updateMemberRole(input: {
  memberId: string;
  organizationId: string;
  role: Role;
  tenantId: string;
}) {
  return withTenantDatabaseContext(async (tx) => {
    await resolveScopedOrganization(tx, input.organizationId, input.tenantId);

    const membership = await tx.membership.findFirst({
      where: {
        id: input.memberId,
        organizationId: input.organizationId,
        tenantId: input.tenantId
      }
    });

    if (!membership) {
      throw new ProblemDetailsError({
        detail: "Member not found for the active tenant.",
        status: 404,
        title: "Not Found"
      });
    }

    await tx.membership.update({
      data: {
        role: input.role
      },
      where: {
        organizationId_userId: {
          organizationId: membership.organizationId,
          userId: membership.userId
        }
      }
    });

    return tx.membership.findFirst({
      include: {
        user: true
      },
      where: {
        id: input.memberId,
        tenantId: input.tenantId
      }
    });
  });
}

export async function removeMember(input: {
  memberId: string;
  organizationId: string;
  tenantId: string;
}) {
  return withTenantDatabaseContext(async (tx) => {
    await resolveScopedOrganization(tx, input.organizationId, input.tenantId);

    const membership = await tx.membership.findFirst({
      where: {
        id: input.memberId,
        organizationId: input.organizationId,
        tenantId: input.tenantId
      }
    });

    if (!membership) {
      throw new ProblemDetailsError({
        detail: "Member not found for the active tenant.",
        status: 404,
        title: "Not Found"
      });
    }

    await tx.membership.delete({
      where: {
        organizationId_userId: {
          organizationId: membership.organizationId,
          userId: membership.userId
        }
      }
    });

    return membership;
  });
}

export async function listAuditLogs(input: {
  actorId?: string;
  cursor?: string;
  entityType?: string;
  from?: string;
  organizationId: string;
  take: number;
  tenantId: string;
  to?: string;
}) {
  return withTenantDatabaseContext(async (tx) => {
    await resolveScopedOrganization(tx, input.organizationId, input.tenantId);

    const rows = await tx.auditLog.findMany({
      orderBy: {
        id: "asc"
      },
      skip: input.cursor ? 1 : 0,
      take: input.take + 1,
      where: {
        ...(input.actorId ? { actorId: input.actorId } : {}),
        ...(input.from || input.to
          ? {
              createdAt: {
                ...(input.from ? { gte: new Date(input.from) } : {}),
                ...(input.to ? { lte: new Date(input.to) } : {})
              }
            }
          : {}),
        ...(input.entityType ? { entityType: input.entityType } : {}),
        tenantId: input.tenantId
      },
      ...(input.cursor
        ? {
            cursor: {
              id: input.cursor
            }
          }
        : {})
    });

    return {
      items: rows.slice(0, input.take),
      nextCursor: rows.length > input.take ? rows[input.take - 1]?.id ?? null : null
    };
  });
}

export async function exportAuditLogsCsv(input: {
  actorId?: string;
  entityType?: string;
  from?: string;
  organizationId: string;
  tenantId: string;
  to?: string;
}) {
  const result = await listAuditLogs({
    ...input,
    take: 500
  });

  return buildAuditCsv(
    result.items.map((row) => ({
      action: row.action,
      actorId: row.actorId,
      createdAt: row.createdAt.toISOString(),
      entityId: row.entityId,
      entityType: row.entityType,
      ip: row.ip,
      userAgent: row.userAgent
    }))
  );
}
