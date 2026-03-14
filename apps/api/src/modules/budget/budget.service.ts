import { createLogger } from "@birthub/logger";
import { randomUUID } from "node:crypto";

import { marketplaceService } from "../marketplace/marketplace-service.js";
import {
  BudgetExceededError,
  createBudgetRecord,
  type BudgetAlert,
  type BudgetRecord,
  type BudgetUsageEvent
} from "./budget.types.js";

const logger = createLogger("budget-service");

type BudgetKey = `${string}:${string}`;

function getBudgetKey(tenantId: string, agentId: string): BudgetKey {
  return `${tenantId}:${agentId}`;
}

export class BudgetService {
  private readonly alerts: BudgetAlert[] = [];
  private readonly records = new Map<BudgetKey, BudgetRecord>();
  private readonly usageEvents: BudgetUsageEvent[] = [];

  setLimit(tenantId: string, agentId: string, limit: number): BudgetRecord {
    const key = getBudgetKey(tenantId, agentId);
    const current = this.records.get(key);

    const next = createBudgetRecord({
      agentId,
      consumed: current?.consumed ?? 0,
      limit,
      tenantId
    });

    this.records.set(key, next);
    return next;
  }

  getRecord(tenantId: string, agentId: string): BudgetRecord {
    const key = getBudgetKey(tenantId, agentId);
    const current = this.records.get(key);

    if (current) {
      return current;
    }

    const created = createBudgetRecord({
      agentId,
      consumed: 0,
      limit: 100,
      tenantId
    });

    this.records.set(key, created);
    return created;
  }

  getUsage(tenantId: string): { alerts: BudgetAlert[]; records: BudgetRecord[]; usageEvents: BudgetUsageEvent[] } {
    return {
      alerts: this.alerts.filter((alert) => alert.tenantId === tenantId),
      records: [...this.records.values()].filter((record) => record.tenantId === tenantId),
      usageEvents: this.usageEvents.filter((event) => event.tenantId === tenantId)
    };
  }

  consumeBudget(input: {
    agentId: string;
    costBRL: number;
    executionMode: "DRY_RUN" | "LIVE";
    tenantId: string;
  }): BudgetRecord {
    const record = this.getRecord(input.tenantId, input.agentId);

    if (input.executionMode === "DRY_RUN") {
      this.usageEvents.push({
        agentId: input.agentId,
        costBRL: 0,
        eventId: randomUUID(),
        executionMode: input.executionMode,
        tenantId: input.tenantId,
        timestamp: new Date().toISOString()
      });

      return record;
    }

    const nextConsumed = Number((record.consumed + input.costBRL).toFixed(4));

    if (nextConsumed > record.limit) {
      this.emitAlert(input.tenantId, input.agentId, "BLOCK_100", record.limit, nextConsumed);
      throw new BudgetExceededError({
        agentId: input.agentId,
        consumed: record.consumed,
        limit: record.limit,
        tenantId: input.tenantId
      });
    }

    const nextRecord = createBudgetRecord({
      agentId: input.agentId,
      consumed: nextConsumed,
      limit: record.limit,
      tenantId: input.tenantId
    });

    this.records.set(getBudgetKey(input.tenantId, input.agentId), nextRecord);
    this.usageEvents.push({
      agentId: input.agentId,
      costBRL: input.costBRL,
      eventId: randomUUID(),
      executionMode: input.executionMode,
      tenantId: input.tenantId,
      timestamp: new Date().toISOString()
    });

    const ratio = nextConsumed / nextRecord.limit;

    if (ratio >= 0.8 && ratio < 1) {
      this.emitAlert(input.tenantId, input.agentId, "WARN_80", nextRecord.limit, nextConsumed);
    }

    if (ratio >= 1) {
      this.emitAlert(input.tenantId, input.agentId, "BLOCK_100", nextRecord.limit, nextConsumed);
    }

    return nextRecord;
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

  exportUsageCsv(tenantId: string): string {
    const events = this.usageEvents.filter((event) => event.tenantId === tenantId);
    const header = "eventId,tenantId,agentId,executionMode,costBRL,timestamp";
    const rows = events.map((event) =>
      [event.eventId, event.tenantId, event.agentId, event.executionMode, event.costBRL, event.timestamp].join(",")
    );

    return [header, ...rows].join("\n");
  }

  private emitAlert(
    tenantId: string,
    agentId: string,
    level: BudgetAlert["level"],
    limit: number,
    consumed: number
  ): void {
    const alreadyExists = this.alerts.some(
      (alert) => alert.tenantId === tenantId && alert.agentId === agentId && alert.level === level
    );

    if (alreadyExists) {
      return;
    }

    const message =
      level === "WARN_80"
        ? `Budget warning: agent ${agentId} reached ${(consumed / limit * 100).toFixed(1)}% usage.`
        : `Budget blocked: agent ${agentId} reached ${(consumed / limit * 100).toFixed(1)}% usage.`;

    const alert: BudgetAlert = {
      agentId,
      level,
      message,
      tenantId,
      timestamp: new Date().toISOString()
    };

    this.alerts.push(alert);

    logger.warn(
      {
        agentId,
        consumed,
        level,
        limit,
        tenantId
      },
      message
    );
  }
}

export const budgetService = new BudgetService();
