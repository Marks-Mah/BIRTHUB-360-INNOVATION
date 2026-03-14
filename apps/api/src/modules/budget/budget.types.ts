import { randomUUID } from "node:crypto";

export class BudgetExceededError extends Error {
  readonly agentId: string;
  readonly consumed: number;
  readonly limit: number;
  readonly tenantId: string;

  constructor(input: { agentId: string; consumed: number; limit: number; tenantId: string }) {
    super(`Budget exhausted for agent ${input.agentId}.`);
    this.name = "BudgetExceededError";
    this.agentId = input.agentId;
    this.consumed = input.consumed;
    this.limit = input.limit;
    this.tenantId = input.tenantId;
  }
}

export interface BudgetAlert {
  agentId: string;
  level: "WARN_80" | "BLOCK_100";
  message: string;
  tenantId: string;
  timestamp: string;
}

export interface BudgetRecord {
  agentId: string;
  consumed: number;
  currency: "BRL";
  id: string;
  limit: number;
  tenantId: string;
  updatedAt: string;
}

export interface BudgetUsageEvent {
  agentId: string;
  costBRL: number;
  eventId: string;
  executionMode: "DRY_RUN" | "LIVE";
  tenantId: string;
  timestamp: string;
}

export function createBudgetRecord(input: {
  agentId: string;
  consumed: number;
  limit: number;
  tenantId: string;
}): BudgetRecord {
  return {
    agentId: input.agentId,
    consumed: input.consumed,
    currency: "BRL",
    id: randomUUID(),
    limit: input.limit,
    tenantId: input.tenantId,
    updatedAt: new Date().toISOString()
  };
}
