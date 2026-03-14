import type { Parser } from "../middleware/validate.js";
import type { ContractStatus } from "../repositories/contract-repository.js";
import type { DealStage } from "../repositories/deal-repository.js";

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

export const customerIdParamsSchema: Parser<{ id: string }> = (value) => {
  const obj = asObject(value);
  const id = typeof obj?.id === "string" ? obj.id.trim() : "";
  if (!id) return { success: false, errors: ["id param is required"] };
  return { success: true, data: { id } };
};

export const createDealBodySchema: Parser<{ title: string; amount: number }> = (value) => {
  const obj = asObject(value);
  if (!obj) return { success: false, errors: ["body must be an object"] };

  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const amount = Number(obj.amount);
  const errors: string[] = [];

  if (title.length < 2 || title.length > 160) errors.push("title must be 2..160 chars");
  if (!Number.isFinite(amount) || amount <= 0) errors.push("amount must be > 0");

  if (errors.length > 0) return { success: false, errors };
  return { success: true, data: { title, amount } };
};

export const updateDealStageBodySchema: Parser<{ stage: DealStage }> = (value) => {
  const obj = asObject(value);
  const valid: DealStage[] = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

  if (!obj || !valid.includes(obj.stage as DealStage)) {
    return { success: false, errors: ["stage is invalid"] };
  }

  return { success: true, data: { stage: obj.stage as DealStage } };
};

export const createContractBodySchema: Parser<{ customerId: string; documentUrl: string; dealId?: string }> = (value) => {
  const obj = asObject(value);
  if (!obj) return { success: false, errors: ["body must be an object"] };

  const customerId = typeof obj.customerId === "string" ? obj.customerId.trim() : "";
  const documentUrl = typeof obj.documentUrl === "string" ? obj.documentUrl.trim() : "";
  const dealId = typeof obj.dealId === "string" ? obj.dealId.trim() : undefined;

  const errors: string[] = [];
  if (!customerId) errors.push("customerId is required");
  if (!/^https?:\/\/.+/.test(documentUrl)) errors.push("documentUrl must be a valid http(s) URL");

  if (errors.length > 0) return { success: false, errors };
  return { success: true, data: { customerId, documentUrl, dealId } };
};

export const updateContractVersionBodySchema: Parser<{ documentUrl: string }> = (value) => {
  const obj = asObject(value);
  const documentUrl = typeof obj?.documentUrl === "string" ? obj.documentUrl.trim() : "";

  if (!/^https?:\/\/.+/.test(documentUrl)) {
    return { success: false, errors: ["documentUrl must be a valid http(s) URL"] };
  }

  return { success: true, data: { documentUrl } };
};

export const updateContractStatusBodySchema: Parser<{ status: ContractStatus }> = (value) => {
  const obj = asObject(value);
  const valid: ContractStatus[] = ["DRAFT", "SENT", "SIGNED", "EXPIRED"];
  if (!obj || !valid.includes(obj.status as ContractStatus)) {
    return { success: false, errors: ["status is invalid"] };
  }
  return { success: true, data: { status: obj.status as ContractStatus } };
};

export const financialReconcileBodySchema: Parser<{ customerId: string; amountCents: number; currency: "BRL" | "USD" }> = (value) => {
  const obj = asObject(value);
  if (!obj) return { success: false, errors: ["body must be an object"] };

  const customerId = typeof obj.customerId === "string" ? obj.customerId.trim() : "";
  const amountCents = Number(obj.amountCents);
  const currency = obj.currency;

  const errors: string[] = [];
  if (!customerId) errors.push("customerId is required");
  if (!Number.isInteger(amountCents) || amountCents <= 0) errors.push("amountCents must be a positive integer");
  if (currency !== "BRL" && currency !== "USD") errors.push("currency must be BRL or USD");

  if (errors.length > 0) return { success: false, errors };
  return { success: true, data: { customerId, amountCents, currency: currency as "BRL" | "USD" } };
};

export const customerNpsBodySchema: Parser<{ score: number; feedback?: string }> = (value) => {
  const obj = asObject(value);
  if (!obj) return { success: false, errors: ["body must be an object"] };

  const score = Number(obj.score);
  const feedback = typeof obj.feedback === "string" ? obj.feedback.trim() : undefined;

  if (!Number.isInteger(score) || score < 0 || score > 10) {
    return { success: false, errors: ["score must be integer 0..10"] };
  }

  if (feedback !== undefined && feedback.length > 500) {
    return { success: false, errors: ["feedback must be <= 500 chars"] };
  }

  return { success: true, data: { score, feedback } };
};
