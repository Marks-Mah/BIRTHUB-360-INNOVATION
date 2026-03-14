import {
  ExceededQuotaError,
  type Prisma,
  prisma,
  type PrismaClient,
  type QuotaResourceType
} from "@birthub/database";

import { readNumericPlanLimit } from "../modules/billing/plan.utils.js";
import { getBillingSnapshot } from "../modules/billing/service.js";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

const defaultLimits: Record<QuotaResourceType, number> = {
  AI_PROMPTS: 1_000,
  API_REQUESTS: 5_000,
  EMAILS_SENT: 2_500,
  STORAGE_GB: 100,
  WORKFLOW_RUNS: 10_000
};

const planLimitKeyByResource: Record<QuotaResourceType, string> = {
  AI_PROMPTS: "aiPrompts",
  API_REQUESTS: "apiRequests",
  EMAILS_SENT: "emails",
  STORAGE_GB: "storageGb",
  WORKFLOW_RUNS: "workflows"
};

async function resolveTenantId(client: DatabaseClient, tenantReference: string): Promise<string> {
  const organization = await client.organization.findFirst({
    where: {
      OR: [{ id: tenantReference }, { tenantId: tenantReference }]
    }
  });

  return organization?.tenantId ?? tenantReference;
}

function currentMonthlyPeriod(reference = new Date()): string {
  const year = reference.getUTCFullYear();
  const month = String(reference.getUTCMonth() + 1).padStart(2, "0");
  return `MONTHLY-${year}-${month}`;
}

function nextMonthlyReset(reference = new Date()): Date {
  return new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1, 0, 0, 0));
}

export class QuotaService {
  constructor(private readonly client: DatabaseClient = prisma) {}

  private async resolveLimit(tenantReference: string, resourceType: QuotaResourceType): Promise<number> {
    try {
      const snapshot = await getBillingSnapshot(tenantReference, 3);
      const planLimit = readNumericPlanLimit(
        snapshot.plan.limits,
        planLimitKeyByResource[resourceType],
        defaultLimits[resourceType]
      );

      if (!Number.isFinite(planLimit)) {
        return Number.MAX_SAFE_INTEGER;
      }

      return Math.max(1, Math.floor(planLimit));
    } catch {
      return defaultLimits[resourceType];
    }
  }

  async checkAndConsume(
    tenantReference: string,
    resourceType: QuotaResourceType,
    amount: number,
    client: DatabaseClient = this.client
  ) {
    const tenantId = await resolveTenantId(client, tenantReference);
    const period = currentMonthlyPeriod();
    const resolvedLimit = await this.resolveLimit(tenantReference, resourceType);
    let quota = await client.quotaUsage.findFirst({
      where: {
        period,
        resourceType,
        tenantId
      }
    });

    if (!quota) {
      quota = await client.quotaUsage.create({
        data: {
          count: 0,
          limit: resolvedLimit,
          period,
          resetAt: nextMonthlyReset(),
          resourceType,
          tenantId
        }
      });
    } else if (quota.limit !== resolvedLimit) {
      quota = await client.quotaUsage.update({
        data: {
          limit: resolvedLimit
        },
        where: {
          id: quota.id
        }
      });
    }

    if (quota.count + amount > quota.limit) {
      throw new ExceededQuotaError({
        current: quota.count,
        limit: quota.limit,
        resetAt: quota.resetAt.toISOString(),
        resourceType,
        tenantId
      });
    }

    return client.quotaUsage.update({
      data: {
        count: {
          increment: amount
        }
      },
      where: {
        id: quota.id
      }
    });
  }

  async listUsage(
    tenantReference: string,
    pagination: {
      cursor?: string;
      take: number;
    },
    client: DatabaseClient = this.client
  ) {
    const tenantId = await resolveTenantId(client, tenantReference);
    const rows = await client.quotaUsage.findMany({
      orderBy: {
        id: "asc"
      },
      skip: pagination.cursor ? 1 : 0,
      take: pagination.take + 1,
      where: {
        tenantId
      },
      ...(pagination.cursor
        ? {
            cursor: {
              id: pagination.cursor
            }
          }
        : {})
    });

    const nextCursor =
      rows.length > pagination.take ? rows[pagination.take - 1]?.id ?? null : null;

    return {
      items: rows.slice(0, pagination.take),
      nextCursor
    };
  }
}
