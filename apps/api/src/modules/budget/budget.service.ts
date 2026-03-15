import { createLogger } from "@birthub/logger";
import { prisma } from "@birthub/database";

import { marketplaceService } from "../marketplace/marketplace-service.js";
import {
  BudgetExceededError,
  type BudgetAlert,
  type BudgetRecord,
  type BudgetUsageEvent
} from "./budget.types.js";

const logger = createLogger("budget-service");
const DEFAULT_BUDGET_LIMIT_BRL = 100;

function toBudgetRecord(record: {
  agentId: string;
  consumedBrl: number;
  id: string;
  limitBrl: number;
  tenantId: string;
  updatedAt: Date;
}): BudgetRecord {
  return {
    agentId: record.agentId,
    consumed: Number(record.consumedBrl.toFixed(4)),
    currency: "BRL",
    id: record.id,
    limit: Number(record.limitBrl.toFixed(4)),
    tenantId: record.tenantId,
    updatedAt: record.updatedAt.toISOString()
  };
}

function toBudgetUsageEvent(event: {
  actorId: string;
  agentId: string;
  costBrl: number;
  executionMode: string;
  id: string;
  kind: string;
  metadata: unknown;
  tenantId: string;
  createdAt: Date;
}): BudgetUsageEvent {
  const effectiveCost =
    event.kind === "DRY_RUN" || event.kind === "WARN_80" || event.kind === "BLOCK_100"
      ? 0
      : event.costBrl;

  return {
    agentId: event.agentId,
    costBRL: Number(effectiveCost.toFixed(4)),
    eventId: event.id,
    executionMode: event.executionMode === "DRY_RUN" ? "DRY_RUN" : "LIVE",
    tenantId: event.tenantId,
    timestamp: event.createdAt.toISOString()
  };
}

function toBudgetAlert(event: {
  agentId: string;
  kind: string;
  metadata: unknown;
  tenantId: string;
  createdAt: Date;
}): BudgetAlert | null {
  if (event.kind !== "WARN_80" && event.kind !== "BLOCK_100") {
    return null;
  }

  const metadata =
    event.metadata && typeof event.metadata === "object"
      ? (event.metadata as { message?: unknown })
      : {};
  const message =
    typeof metadata.message === "string"
      ? metadata.message
      : event.kind === "WARN_80"
        ? `Budget warning for agent ${event.agentId}.`
        : `Budget blocked for agent ${event.agentId}.`;

  return {
    agentId: event.agentId,
    level: event.kind,
    message,
    tenantId: event.tenantId,
    timestamp: event.createdAt.toISOString()
  };
}

async function upsertBudgetRecord(input: {
  agentId: string;
  organizationId: string;
  tenantId: string;
}) {
  return prisma.agentBudget.upsert({
    create: {
      agentId: input.agentId,
      organizationId: input.organizationId,
      tenantId: input.tenantId
    },
    update: {},
    where: {
      tenantId_agentId: {
        agentId: input.agentId,
        tenantId: input.tenantId
      }
    }
  });
}

export class BudgetService {
  async setLimit(
    organizationId: string,
    tenantId: string,
    agentId: string,
    limit: number
  ): Promise<BudgetRecord> {
    const record = await prisma.agentBudget.upsert({
      create: {
        agentId,
        limitBrl: limit,
        organizationId,
        tenantId
      },
      update: {
        limitBrl: limit
      },
      where: {
        tenantId_agentId: {
          agentId,
          tenantId
        }
      }
    });

    return toBudgetRecord(record);
  }

  async getRecord(
    organizationId: string,
    tenantId: string,
    agentId: string
  ): Promise<BudgetRecord> {
    const record = await upsertBudgetRecord({
      agentId,
      organizationId,
      tenantId
    });

    return toBudgetRecord(record);
  }

  async getUsage(
    organizationId: string,
    tenantId: string
  ): Promise<{
    alerts: BudgetAlert[];
    records: BudgetRecord[];
    usageEvents: BudgetUsageEvent[];
  }> {
    const [records, events] = await Promise.all([
      prisma.agentBudget.findMany({
        orderBy: {
          updatedAt: "desc"
        },
        where: {
          organizationId,
          tenantId
        }
      }),
      prisma.agentBudgetEvent.findMany({
        orderBy: {
          createdAt: "desc"
        },
        take: 250,
        where: {
          organizationId,
          tenantId
        }
      })
    ]);

    return {
      alerts: events
        .map((event) => toBudgetAlert(event))
        .filter((event): event is BudgetAlert => event !== null),
      records: records.map((record) => toBudgetRecord(record)),
      usageEvents: events
        .filter((event) => event.kind === "CONSUME" || event.kind === "DRY_RUN")
        .map((event) => toBudgetUsageEvent(event))
    };
  }

  async consumeBudget(input: {
    actorId: string;
    agentId: string;
    costBRL: number;
    executionMode: "DRY_RUN" | "LIVE";
    organizationId: string;
    requestId?: string;
    tenantId: string;
  }): Promise<BudgetRecord> {
    return prisma.$transaction(async (tx) => {
      const record = await tx.agentBudget.upsert({
        create: {
          agentId: input.agentId,
          limitBrl: DEFAULT_BUDGET_LIMIT_BRL,
          organizationId: input.organizationId,
          tenantId: input.tenantId
        },
        update: {},
        where: {
          tenantId_agentId: {
            agentId: input.agentId,
            tenantId: input.tenantId
          }
        }
      });

      if (input.executionMode === "DRY_RUN") {
        await tx.agentBudgetEvent.create({
          data: {
            actorId: input.actorId,
            agentId: input.agentId,
            executionMode: input.executionMode,
            kind: "DRY_RUN",
            metadata: {
              note: "Dry-run executions do not consume budget."
            },
            organizationId: input.organizationId,
            requestId: input.requestId ?? null,
            tenantId: input.tenantId
          }
        });

        return toBudgetRecord(record);
      }

      const nextConsumed = Number((record.consumedBrl + input.costBRL).toFixed(4));

      if (nextConsumed > record.limitBrl) {
        const ratio = record.limitBrl === 0 ? 1 : nextConsumed / record.limitBrl;
        const message = `Budget blocked: agent ${input.agentId} reached ${(ratio * 100).toFixed(1)}% usage.`;

        await tx.agentBudget.update({
          data: {
            lastAlertLevel: "BLOCK_100"
          },
          where: {
            id: record.id
          }
        });

        await tx.agentBudgetEvent.create({
          data: {
            actorId: input.actorId,
            agentId: input.agentId,
            costBrl: input.costBRL,
            executionMode: input.executionMode,
            kind: "BLOCK_100",
            metadata: {
              consumedBrl: nextConsumed,
              limitBrl: record.limitBrl,
              message
            },
            organizationId: input.organizationId,
            requestId: input.requestId ?? null,
            tenantId: input.tenantId
          }
        });

        logger.warn(
          {
            agentId: input.agentId,
            consumed: nextConsumed,
            limit: record.limitBrl,
            tenantId: input.tenantId
          },
          message
        );

        throw new BudgetExceededError({
          agentId: input.agentId,
          consumed: record.consumedBrl,
          limit: record.limitBrl,
          tenantId: input.tenantId
        });
      }

      const updated = await tx.agentBudget.update({
        data: {
          consumedBrl: nextConsumed
        },
        where: {
          id: record.id
        }
      });

      await tx.agentBudgetEvent.create({
        data: {
          actorId: input.actorId,
          agentId: input.agentId,
          costBrl: input.costBRL,
          executionMode: input.executionMode,
          kind: "CONSUME",
          metadata: {
            consumedBrl: nextConsumed,
            limitBrl: updated.limitBrl
          },
          organizationId: input.organizationId,
          requestId: input.requestId ?? null,
          tenantId: input.tenantId
        }
      });

      const ratio = updated.limitBrl === 0 ? 1 : nextConsumed / updated.limitBrl;

      if (ratio >= 0.8 && updated.lastAlertLevel !== "WARN_80") {
        const level = ratio >= 1 ? "BLOCK_100" : "WARN_80";
        const message =
          level === "WARN_80"
            ? `Budget warning: agent ${input.agentId} reached ${(ratio * 100).toFixed(1)}% usage.`
            : `Budget blocked: agent ${input.agentId} reached ${(ratio * 100).toFixed(1)}% usage.`;

        await tx.agentBudget.update({
          data: {
            lastAlertLevel: level
          },
          where: {
            id: updated.id
          }
        });

        await tx.agentBudgetEvent.create({
          data: {
            actorId: input.actorId,
            agentId: input.agentId,
            executionMode: input.executionMode,
            kind: level,
            metadata: {
              consumedBrl: nextConsumed,
              limitBrl: updated.limitBrl,
              message
            },
            organizationId: input.organizationId,
            requestId: input.requestId ?? null,
            tenantId: input.tenantId
          }
        });

        logger.warn(
          {
            agentId: input.agentId,
            consumed: nextConsumed,
            level,
            limit: updated.limitBrl,
            tenantId: input.tenantId
          },
          message
        );
      }

      return toBudgetRecord(updated);
    });
  }

  async estimateCost(agentId: string): Promise<{ avgCostBRL: number; details: string }> {
    const entry = await marketplaceService.getAgentById(agentId);

    if (!entry) {
      return {
        avgCostBRL: 0.5,
        details: "Fallback estimate used because agent was not found in catalog."
      };
    }

    const toolCost = entry.manifest.tools.length * 0.08;
    const skillCost = entry.manifest.skills.length * 0.04;
    const baseCost = 0.15;
    const avgCostBRL = Number((baseCost + toolCost + skillCost).toFixed(2));

    return {
      avgCostBRL,
      details: `Base ${baseCost.toFixed(2)} + ${entry.manifest.tools.length} tools + ${entry.manifest.skills.length} skills.`
    };
  }

  async exportUsageCsv(organizationId: string, tenantId: string): Promise<string> {
    const events = await prisma.agentBudgetEvent.findMany({
      orderBy: {
        createdAt: "asc"
      },
      where: {
        kind: {
          in: ["CONSUME", "DRY_RUN"]
        },
        organizationId,
        tenantId
      }
    });
    const header = "eventId,tenantId,agentId,executionMode,costBRL,timestamp,actorId,requestId";
    const rows = events.map((event) =>
      [
        event.id,
        event.tenantId,
        event.agentId,
        event.executionMode,
        event.costBrl,
        event.createdAt.toISOString(),
        event.actorId,
        event.requestId ?? ""
      ].join(",")
    );

    return [header, ...rows].join("\n");
  }
}

export const budgetService = new BudgetService();
