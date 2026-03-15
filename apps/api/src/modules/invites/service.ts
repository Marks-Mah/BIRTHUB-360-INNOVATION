import { randomBytes } from "node:crypto";

import { type Prisma, prisma, Role, withTenantDatabaseContext } from "@birthub/database";
import { createLogger } from "@birthub/logger";

import { ProblemDetailsError } from "../../lib/problem-details.js";

const logger = createLogger("api-invites");

function resolveDefaultExpiry(input?: string): Date {
  return input ? new Date(input) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
}

export async function createInvite(input: {
  email: string;
  expiresAt?: string;
  invitedByUserId?: string | null;
  organizationId: string;
  role: Role;
  tenantId: string;
}) {
  return withTenantDatabaseContext(async (tx) => {
    const organization = await tx.organization.findFirst({
      where: {
        id: input.organizationId,
        tenantId: input.tenantId
      }
    });

    if (!organization) {
      throw new ProblemDetailsError({
        detail: "Organization not found for the active tenant.",
        status: 404,
        title: "Not Found"
      });
    }

    const invite = await tx.invite.create({
      data: {
        email: input.email,
        expiresAt: resolveDefaultExpiry(input.expiresAt),
        invitedByUserId: input.invitedByUserId ?? null,
        organizationId: input.organizationId,
        role: input.role,
        tenantId: input.tenantId,
        token: randomBytes(24).toString("hex")
      }
    });

    logger.info(
      {
        inviteId: invite.id,
        recipient: input.email,
        tenantId: input.tenantId,
        token: invite.token
      },
      "Mock invite email queued"
    );

    return invite;
  });
}

export async function acceptInvite(input: {
  name?: string;
  token: string;
  userId?: string;
}) {
  const invite = await prisma.invite.findUnique({
    where: {
      token: input.token
    }
  });

  if (!invite || invite.status !== "PENDING") {
    throw new ProblemDetailsError({
      detail: "Invite token is invalid or no longer active.",
      status: 404,
      title: "Not Found"
    });
  }

  if (invite.expiresAt < new Date()) {
    throw new ProblemDetailsError({
      detail: "Invite token has expired.",
      status: 410,
      title: "Gone"
    });
  }

  return prisma.$transaction(async (tx) => {
    const user =
      input.userId
        ? await tx.user.findUnique({
            where: {
              id: input.userId
            }
          })
        : null;

    const invitedUser =
      user ??
      (await tx.user.upsert({
        create: {
          email: invite.email,
          name: input.name ?? invite.email.split("@")[0] ?? "Invited User"
        },
        update: input.name ? { name: input.name } : {},
        where: {
          email: invite.email
        }
      }));

    const membership = await tx.membership.upsert({
      create: {
        organizationId: invite.organizationId,
        role: invite.role,
        tenantId: invite.tenantId,
        userId: invitedUser.id
      },
      update: {
        role: invite.role,
        status: "ACTIVE",
        tenantId: invite.tenantId
      },
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId: invitedUser.id
        }
      }
    });

    await tx.invite.update({
      data: {
        acceptedAt: new Date(),
        status: "ACCEPTED"
      },
      where: {
        id: invite.id
      }
    });

    return {
      membershipId: membership.id,
      tenantId: invite.tenantId,
      userId: invitedUser.id
    };
  });
}

export async function revokeInvite(input: { inviteId: string; tenantId: string }) {
  return withTenantDatabaseContext(async (tx) => {
    const invite = await tx.invite.findFirst({
      where: {
        id: input.inviteId,
        tenantId: input.tenantId
      }
    });

    if (!invite) {
      throw new ProblemDetailsError({
        detail: "Invite not found for the active tenant.",
        status: 404,
        title: "Not Found"
      });
    }

    return tx.invite.update({
      data: {
        revokedAt: new Date(),
        status: "REVOKED"
      },
      where: {
        id: invite.id
      }
    });
  });
}

export async function listInvites(input: {
  cursor?: string;
  take: number;
  tenantId: string;
}) {
  return withTenantDatabaseContext(async (tx) => {
    const rows = await tx.invite.findMany({
      orderBy: {
        id: "asc"
      },
      skip: input.cursor ? 1 : 0,
      take: input.take + 1,
      where: {
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

export async function cleanupExpiredInvites() {
  return prisma.invite.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });
}
