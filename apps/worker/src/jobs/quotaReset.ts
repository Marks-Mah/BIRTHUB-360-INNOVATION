import { QuotaResourceType, prisma } from "@birthub/database";

const defaultLimits: Record<QuotaResourceType, number> = {
  AI_PROMPTS: 1_000,
  API_REQUESTS: 5_000,
  EMAILS_SENT: 2_500,
  STORAGE_GB: 100,
  WORKFLOW_RUNS: 10_000
};

function currentMonthlyPeriod(reference = new Date()): string {
  const year = reference.getUTCFullYear();
  const month = String(reference.getUTCMonth() + 1).padStart(2, "0");
  return `MONTHLY-${year}-${month}`;
}

function nextMonthlyReset(reference = new Date()): Date {
  return new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1, 0, 0, 0));
}

export async function quotaResetJob(reference = new Date()) {
  const organizations = await prisma.organization.findMany({
    select: {
      tenantId: true
    }
  });

  const period = currentMonthlyPeriod(reference);
  let upserts = 0;

  for (const organization of organizations) {
    for (const resourceType of Object.values(QuotaResourceType)) {
      await prisma.quotaUsage.upsert({
        create: {
          count: 0,
          limit: defaultLimits[resourceType],
          period,
          resetAt: nextMonthlyReset(reference),
          resourceType,
          tenantId: organization.tenantId
        },
        update: {},
        where: {
          tenantId_resourceType_period: {
            period,
            resourceType,
            tenantId: organization.tenantId
          }
        }
      });

      upserts += 1;
    }
  }

  return {
    period,
    upserts
  };
}
