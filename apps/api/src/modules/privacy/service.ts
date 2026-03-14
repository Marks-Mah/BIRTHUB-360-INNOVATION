import type { ApiConfig } from "@birthub/config";
import {
  ApiKeyStatus,
  MembershipStatus,
  Role,
  UserStatus,
  prisma
} from "@birthub/database";

import { ProblemDetailsError } from "../../lib/problem-details.js";
import { getRoleForUser } from "../auth/auth.service.js";
import { hashPassword, randomToken } from "../auth/crypto.js";
import { cancelBillingForOrganization } from "../billing/service.js";

export const PRIVACY_DELETE_CONFIRMATION = "EXCLUIR MINHA CONTA";

function buildAnonymizedEmail(userId: string): string {
  return `deleted+${userId}@privacy.birthhub360.invalid`;
}

async function findOrganization(organizationReference: string) {
  return prisma.organization.findFirst({
    where: {
      OR: [{ id: organizationReference }, { tenantId: organizationReference }]
    }
  });
}

export async function exportTenantData(input: {
  organizationReference: string;
  requestedByUserId: string;
}) {
  const organization = await prisma.organization.findFirst({
    include: {
      agents: true,
      apiKeys: true,
      auditLogs: true,
      customers: true,
      invoices: true,
      invites: true,
      loginAlerts: true,
      memberships: {
        include: {
          user: true
        }
      },
      paymentMethods: true,
      plan: true,
      stepResults: true,
      subscriptions: true,
      usageRecords: true,
      workflowExecutions: true,
      workflows: true
    },
    where: {
      OR: [{ id: input.organizationReference }, { tenantId: input.organizationReference }]
    }
  });

  if (!organization) {
    throw new ProblemDetailsError({
      detail: "Organization not found for tenant export.",
      status: 404,
      title: "Not Found"
    });
  }

  return {
    billing: {
      invoices: organization.invoices.map((invoice) => ({
        amountDueCents: invoice.amountDueCents,
        amountPaidCents: invoice.amountPaidCents,
        createdAt: invoice.createdAt,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        id: invoice.id,
        status: invoice.status
      })),
      paymentMethods: organization.paymentMethods.map((method) => ({
        brand: method.brand,
        createdAt: method.createdAt,
        expMonth: method.expMonth,
        expYear: method.expYear,
        id: method.id,
        isDefault: method.isDefault,
        last4: method.last4
      })),
      plan: organization.plan
        ? {
            code: organization.plan.code,
            description: organization.plan.description,
            name: organization.plan.name
          }
        : null,
      subscriptions: organization.subscriptions.map((subscription) => ({
        canceledAt: subscription.canceledAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
        gracePeriodEndsAt: subscription.gracePeriodEndsAt,
        id: subscription.id,
        status: subscription.status,
        stripeCustomerId: subscription.stripeCustomerId
      })),
      usageRecords: organization.usageRecords.map((usage) => ({
        id: usage.id,
        metadata: usage.metadata,
        metric: usage.metric,
        occurredAt: usage.occurredAt,
        quantity: usage.quantity,
        unit: usage.unit
      }))
    },
    customers: organization.customers,
    exportedAt: new Date().toISOString(),
    exportedBy: input.requestedByUserId,
    organization: {
      createdAt: organization.createdAt,
      id: organization.id,
      name: organization.name,
      settings: organization.settings,
      slug: organization.slug,
      tenantId: organization.tenantId,
      updatedAt: organization.updatedAt
    },
    people: {
      apiKeys: organization.apiKeys.map((apiKey) => ({
        createdAt: apiKey.createdAt,
        id: apiKey.id,
        label: apiKey.label,
        last4: apiKey.last4,
        scopes: apiKey.scopes,
        status: apiKey.status,
        userId: apiKey.userId
      })),
      invites: organization.invites.map((invite) => ({
        acceptedAt: invite.acceptedAt,
        createdAt: invite.createdAt,
        email: invite.email,
        expiresAt: invite.expiresAt,
        id: invite.id,
        invitedByUserId: invite.invitedByUserId,
        role: invite.role,
        status: invite.status
      })),
      loginAlerts: organization.loginAlerts,
      memberships: organization.memberships.map((membership) => ({
        createdAt: membership.createdAt,
        role: membership.role,
        status: membership.status,
        user: {
          createdAt: membership.user.createdAt,
          email: membership.user.email,
          id: membership.user.id,
          mfaEnabled: membership.user.mfaEnabled,
          name: membership.user.name,
          status: membership.user.status,
          suspendedAt: membership.user.suspendedAt,
          updatedAt: membership.user.updatedAt
        },
        userId: membership.userId
      }))
    },
    securityAndAudit: {
      auditLogs: organization.auditLogs,
      note: "Segredos de integracao, hashes de senha, tokens de sessao e chaves privadas nao fazem parte deste export."
    },
    workflows: {
      agents: organization.agents,
      executions: organization.workflowExecutions,
      results: organization.stepResults,
      workflows: organization.workflows.map((workflow) => ({
        archivedAt: workflow.archivedAt,
        createdAt: workflow.createdAt,
        cronExpression: workflow.cronExpression,
        definition: workflow.definition,
        description: workflow.description,
        eventTopic: workflow.eventTopic,
        id: workflow.id,
        maxDepth: workflow.maxDepth,
        name: workflow.name,
        publishedAt: workflow.publishedAt,
        status: workflow.status,
        triggerConfig: workflow.triggerConfig,
        triggerType: workflow.triggerType,
        updatedAt: workflow.updatedAt,
        version: workflow.version
      }))
    }
  };
}

export async function recordTenantDataExport(input: {
  organizationReference: string;
  userId: string;
}) {
  const organization = await findOrganization(input.organizationReference);

  if (!organization) {
    return;
  }

  await prisma.auditLog.create({
    data: {
      action: "tenant.data_exported",
      actorId: input.userId,
      diff: {
        after: {
          exportedAt: new Date().toISOString()
        },
        before: {}
      },
      entityId: organization.id,
      entityType: "organization",
      tenantId: organization.tenantId
    }
  });
}

export async function deleteAccountAndPersonalData(input: {
  config: ApiConfig;
  confirmationText: string;
  organizationReference: string;
  userId: string;
}) {
  if (input.confirmationText !== PRIVACY_DELETE_CONFIRMATION) {
    throw new ProblemDetailsError({
      detail: `Type '${PRIVACY_DELETE_CONFIRMATION}' to confirm account deletion.`,
      status: 400,
      title: "Bad Request"
    });
  }

  const organization = await findOrganization(input.organizationReference);

  if (!organization) {
    throw new ProblemDetailsError({
      detail: "Organization not found for privacy deletion.",
      status: 404,
      title: "Not Found"
    });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: input.userId
    }
  });

  if (!user) {
    throw new ProblemDetailsError({
      detail: "User not found for privacy deletion.",
      status: 404,
      title: "Not Found"
    });
  }

  const role = await getRoleForUser({
    organizationId: organization.id,
    userId: input.userId
  });
  const shouldCancelBilling = role === Role.OWNER;
  const billing = shouldCancelBilling
    ? await cancelBillingForOrganization({
        config: input.config,
        organizationReference: organization.id
      })
    : { canceled: false };
  const anonymizedEmail = buildAnonymizedEmail(input.userId);
  const passwordHash = await hashPassword(
    randomToken(18),
    input.config.AUTH_BCRYPT_SALT_ROUNDS
  );

  await prisma.$transaction(async (tx) => {
    await tx.session.updateMany({
      data: {
        revokedAt: new Date()
      },
      where: {
        organizationId: organization.id,
        revokedAt: null,
        userId: input.userId
      }
    });

    await tx.apiKey.updateMany({
      data: {
        revokedAt: new Date(),
        status: ApiKeyStatus.REVOKED
      },
      where: {
        organizationId: organization.id,
        userId: input.userId
      }
    });

    await tx.mfaChallenge.deleteMany({
      where: {
        userId: input.userId
      }
    });

    await tx.mfaRecoveryCode.deleteMany({
      where: {
        userId: input.userId
      }
    });

    await tx.membership.updateMany({
      data: {
        status: MembershipStatus.REVOKED
      },
      where: {
        organizationId: organization.id,
        userId: input.userId
      }
    });

    await tx.user.update({
      data: {
        email: anonymizedEmail,
        mfaEnabled: false,
        mfaSecret: null,
        name: "Deleted User",
        passwordHash,
        status: UserStatus.SUSPENDED,
        suspendedAt: new Date()
      },
      where: {
        id: input.userId
      }
    });

    await tx.auditLog.create({
      data: {
        action: "user.privacy_deleted",
        actorId: input.userId,
        diff: {
          after: {
            email: anonymizedEmail,
            status: UserStatus.SUSPENDED
          },
          before: {
            email: user.email,
            status: user.status
          }
        },
        entityId: input.userId,
        entityType: "user",
        tenantId: organization.tenantId
      }
    });
  });

  return {
    anonymizedEmail,
    billingCancelled: billing.canceled
  };
}
