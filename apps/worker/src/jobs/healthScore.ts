import {
  createNotificationForOrganizationRoles,
  NotificationType,
  prisma
} from "@birthub/database";
import { createLogger } from "@birthub/logger";

import { emitInternalEvent } from "../events/internalEventBus.js";
import { syncOrganizationToHubspot } from "../integrations/hubspot.js";

const logger = createLogger("worker-health-score");

export interface HealthScoreInputs {
  activeUsers: number;
  agentRuns: number;
  billingErrors: number;
  loginCount: number;
  runFailures: number;
  workflowRuns: number;
}

export function clampHealthScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function calculateHealthScore(input: HealthScoreInputs): number {
  let score = 100;

  if (input.billingErrors > 0) {
    score -= 20;
  }

  if (input.activeUsers === 0) {
    score -= 25;
  } else if (input.activeUsers >= 3) {
    score += 5;
  }

  if (input.agentRuns > 5) {
    score += 10;
  } else if (input.agentRuns === 0) {
    score -= 10;
  }

  if (input.workflowRuns === 0) {
    score -= 5;
  }

  if (input.loginCount === 0) {
    score -= 10;
  }

  if (input.runFailures >= 5) {
    score -= 15;
  } else if (input.runFailures >= 1) {
    score -= 5;
  }

  return clampHealthScore(score);
}

export function shouldEmitChurnRisk(previousScore: number, nextScore: number): boolean {
  return previousScore >= 40 && nextScore < 40;
}

async function buildActivityWindow(input: {
  from: Date;
  organizationId: string;
  tenantId: string;
  windowDays: number;
}) {
  const [
    activeSessions,
    loginCount,
    agentRuns,
    workflowRuns,
    failedAgents,
    failedWorkflows,
    billingErrors
  ] = await Promise.all([
    prisma.session.findMany({
      distinct: ["userId"],
      select: {
        userId: true
      },
      where: {
        lastActivityAt: {
          gte: input.from
        },
        tenantId: input.tenantId
      }
    }),
    prisma.session.count({
      where: {
        createdAt: {
          gte: input.from
        },
        tenantId: input.tenantId
      }
    }),
    prisma.agentExecution.count({
      where: {
        startedAt: {
          gte: input.from
        },
        tenantId: input.tenantId
      }
    }),
    prisma.workflowExecution.count({
      where: {
        startedAt: {
          gte: input.from
        },
        tenantId: input.tenantId
      }
    }),
    prisma.agentExecution.count({
      where: {
        startedAt: {
          gte: input.from
        },
        status: "FAILED",
        tenantId: input.tenantId
      }
    }),
    prisma.workflowExecution.count({
      where: {
        startedAt: {
          gte: input.from
        },
        status: "FAILED",
        tenantId: input.tenantId
      }
    }),
    prisma.invoice.count({
      where: {
        createdAt: {
          gte: input.from
        },
        organizationId: input.organizationId,
        status: {
          in: ["past_due", "uncollectible"]
        }
      }
    })
  ]);

  const record = await prisma.tenantActivityWindow.upsert({
    create: {
      activeUsers: activeSessions.length,
      agentRuns,
      billingErrors,
      computedAt: new Date(),
      loginCount,
      organizationId: input.organizationId,
      runFailures: failedAgents + failedWorkflows,
      tenantId: input.tenantId,
      windowDays: input.windowDays,
      workflowRuns
    },
    update: {
      activeUsers: activeSessions.length,
      agentRuns,
      billingErrors,
      computedAt: new Date(),
      loginCount,
      runFailures: failedAgents + failedWorkflows,
      workflowRuns
    },
    where: {
      tenantId_windowDays: {
        tenantId: input.tenantId,
        windowDays: input.windowDays
      }
    }
  });

  return record;
}

export async function refreshTenantActivityWindows(organizationId?: string) {
  const organizations = organizationId
    ? await prisma.organization.findMany({
        where: {
          id: organizationId
        }
      })
    : await prisma.organization.findMany();

  const results = [];

  for (const organization of organizations) {
    const windows = await Promise.all(
      [7, 14, 30].map((windowDays) =>
        buildActivityWindow({
          from: new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000),
          organizationId: organization.id,
          tenantId: organization.tenantId,
          windowDays
        })
      )
    );

    results.push({
      organizationId: organization.id,
      tenantId: organization.tenantId,
      windows
    });
  }

  return results;
}

export async function computeAndPersistHealthScores() {
  const refreshed = await refreshTenantActivityWindows();
  const summary = [];

  for (const item of refreshed) {
    const metrics30d = item.windows.find((window) => window.windowDays === 30);

    if (!metrics30d) {
      continue;
    }

    const organization = await prisma.organization.findUnique({
      where: {
        id: item.organizationId
      }
    });

    if (!organization) {
      continue;
    }

    const nextScore = calculateHealthScore({
      activeUsers: metrics30d.activeUsers,
      agentRuns: metrics30d.agentRuns,
      billingErrors: metrics30d.billingErrors,
      loginCount: metrics30d.loginCount,
      runFailures: metrics30d.runFailures,
      workflowRuns: metrics30d.workflowRuns
    });

    await prisma.organization.update({
      data: {
        healthScore: nextScore
      },
      where: {
        id: organization.id
      }
    });

    if (shouldEmitChurnRisk(organization.healthScore, nextScore)) {
      emitInternalEvent({
        event: "tenant.churn_risk",
        payload: {
          healthScore: nextScore,
          organizationId: organization.id
        },
        tenantId: organization.tenantId
      });

      await createNotificationForOrganizationRoles({
        content: `Conta em risco: o tenant ${organization.slug} caiu para health score ${nextScore}.`,
        link: `/admin/cs?tenantId=${encodeURIComponent(organization.tenantId)}`,
        organizationId: organization.id,
        tenantId: organization.tenantId,
        type: NotificationType.CHURN_RISK
      });
    }

    await syncOrganizationToHubspot({
      organizationId: organization.id,
      tenantId: organization.tenantId
    }).catch((error) => {
      logger.error(
        {
          error,
          organizationId: organization.id,
          tenantId: organization.tenantId
        },
        "Health score HubSpot sync failed"
      );
    });

    summary.push({
      healthScore: nextScore,
      organizationId: organization.id,
      tenantId: organization.tenantId
    });
  }

  return summary;
}
