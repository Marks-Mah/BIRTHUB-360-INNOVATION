import type { Parser } from "../middleware/validate.js";
import type { ContractStatus } from "../repositories/contract-repository.js";
import type { DealStage } from "../repositories/deal-repository.js";

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function parseLimit(raw: unknown, errors: string[]): number | undefined {
  if (raw === undefined) return undefined;
  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    errors.push("limit must be integer 1..100");
    return undefined;
  }
  return limit;
}

export const commonCursorQuerySchema: Parser<{ cursor?: string; limit?: number }> = (value) => {
  const obj = asObject(value);
  if (!obj) return { success: false, errors: ["query must be object"] };

  const errors: string[] = [];
  const cursor = typeof obj.cursor === "string" && obj.cursor.trim().length > 0 ? obj.cursor.trim() : undefined;
  const limit = parseLimit(obj.limit, errors);

  if (errors.length > 0) return { success: false, errors };
  return { success: true, data: { cursor, limit } };
};

export const dealsListQuerySchema: Parser<{ cursor?: string; limit?: number; stage?: DealStage; minAmount?: number; maxAmount?: number }> = (value) => {
  const obj = asObject(value);
  if (!obj) return { success: false, errors: ["query must be object"] };

  const validStages: DealStage[] = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
  const errors: string[] = [];
  const cursor = typeof obj.cursor === "string" && obj.cursor.trim().length > 0 ? obj.cursor.trim() : undefined;
  const limit = parseLimit(obj.limit, errors);

  const stage = obj.stage as DealStage | undefined;
  if (stage !== undefined && !validStages.includes(stage)) errors.push("stage is invalid");

  const minAmount = obj.minAmount === undefined ? undefined : Number(obj.minAmount);
  const maxAmount = obj.maxAmount === undefined ? undefined : Number(obj.maxAmount);

  if (minAmount !== undefined && (!Number.isFinite(minAmount) || minAmount < 0)) errors.push("minAmount must be >= 0");
  if (maxAmount !== undefined && (!Number.isFinite(maxAmount) || maxAmount < 0)) errors.push("maxAmount must be >= 0");
  if (minAmount !== undefined && maxAmount !== undefined && minAmount > maxAmount) errors.push("minAmount cannot be greater than maxAmount");

  if (errors.length > 0) return { success: false, errors };
  return { success: true, data: { cursor, limit, stage, minAmount, maxAmount } };
};

export const contractsListQuerySchema: Parser<{ cursor?: string; limit?: number; customerId?: string; dealId?: string; status?: ContractStatus }> = (value) => {
  const obj = asObject(value);
  if (!obj) return { success: false, errors: ["query must be object"] };

  const validStatus: ContractStatus[] = ["DRAFT", "SENT", "SIGNED", "EXPIRED"];
  const errors: string[] = [];
  const cursor = typeof obj.cursor === "string" && obj.cursor.trim().length > 0 ? obj.cursor.trim() : undefined;
  const limit = parseLimit(obj.limit, errors);

  const customerId = typeof obj.customerId === "string" && obj.customerId.trim().length > 0 ? obj.customerId.trim() : undefined;
  const dealId = typeof obj.dealId === "string" && obj.dealId.trim().length > 0 ? obj.dealId.trim() : undefined;
  const status = obj.status as ContractStatus | undefined;
  if (status !== undefined && !validStatus.includes(status)) errors.push("status is invalid");

  if (errors.length > 0) return { success: false, errors };
  return { success: true, data: { cursor, limit, customerId, dealId, status } };
};

export const invoiceIdParamsSchema: Parser<{ id: string }> = (value) => {
  const obj = asObject(value);
  const id = typeof obj?.id === "string" ? obj.id.trim() : "";
  if (!id) return { success: false, errors: ["id param is required"] };
  return { success: true, data: { id } };
};
