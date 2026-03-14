import type { LeadStatus, UpdateLeadInput } from "../repositories/lead-repository.js";
import type { Parser } from "../middleware/validate.js";

type LeadListQuery = {
  cursor?: string;
  limit?: number;
  status?: LeadStatus;
  minScore?: number;
  assignee?: string;
  sortBy?: "createdAt" | "score";
  sortOrder?: "asc" | "desc";
};

const validStatuses: LeadStatus[] = ["NEW", "QUALIFIED", "CONTACTED", "LOST"];

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

export const createLeadBodySchema: Parser<{
  name: string;
  email: string;
  status: LeadStatus;
  score: number;
  assignee: string;
}> = (value) => {
  const obj = asObject(value);
  const errors: string[] = [];

  if (!obj) return { success: false, errors: ["body must be an object"] };

  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  const email = typeof obj.email === "string" ? obj.email.trim() : "";
  const status = obj.status;
  const score = typeof obj.score === "number" ? obj.score : Number.NaN;
  const assignee = typeof obj.assignee === "string" ? obj.assignee.trim() : "";

  if (name.length < 2 || name.length > 120) errors.push("name must be 2..120 chars");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email must be valid");
  if (!validStatuses.includes(status as LeadStatus)) errors.push("status is invalid");
  if (!Number.isInteger(score) || score < 0 || score > 100)
    errors.push("score must be an integer between 0 and 100");
  if (assignee.length < 2 || assignee.length > 80) errors.push("assignee must be 2..80 chars");

  if (errors.length) return { success: false, errors };

  return { success: true, data: { name, email, status: status as LeadStatus, score, assignee } };
};

export const updateLeadBodySchema: Parser<UpdateLeadInput> = (value) => {
  const obj = asObject(value);
  if (!obj) return { success: false, errors: ["body must be an object"] };

  const updates: UpdateLeadInput = {};
  const errors: string[] = [];

  if (obj.name !== undefined) {
    if (typeof obj.name !== "string" || obj.name.trim().length < 2 || obj.name.trim().length > 120) {
      errors.push("name must be 2..120 chars");
    } else updates.name = obj.name.trim();
  }
  if (obj.email !== undefined) {
    if (typeof obj.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(obj.email.trim())) {
      errors.push("email must be valid");
    } else updates.email = obj.email.trim();
  }
  if (obj.status !== undefined) {
    if (!validStatuses.includes(obj.status as LeadStatus)) errors.push("status is invalid");
    else updates.status = obj.status as LeadStatus;
  }
  if (obj.score !== undefined) {
    const score = Number(obj.score);
    if (!Number.isInteger(score) || score < 0 || score > 100) errors.push("score must be integer 0..100");
    else updates.score = score;
  }
  if (obj.assignee !== undefined) {
    if (typeof obj.assignee !== "string" || obj.assignee.trim().length < 2 || obj.assignee.trim().length > 80) {
      errors.push("assignee must be 2..80 chars");
    } else updates.assignee = obj.assignee.trim();
  }

  if (Object.keys(updates).length === 0) errors.push("at least one updatable field is required");
  if (errors.length) return { success: false, errors };
  return { success: true, data: updates };
};

export const updateLeadStatusBodySchema: Parser<{ status: LeadStatus }> = (value) => {
  const obj = asObject(value);
  if (!obj) return { success: false, errors: ["body must be an object"] };
  if (!validStatuses.includes(obj.status as LeadStatus)) return { success: false, errors: ["status is invalid"] };
  return { success: true, data: { status: obj.status as LeadStatus } };
};

export const leadIdParamsSchema: Parser<{ id: string }> = (value) => {
  const obj = asObject(value);
  const id = typeof obj?.id === "string" ? obj.id.trim() : "";
  if (!id) return { success: false, errors: ["id param is required"] };
  return { success: true, data: { id } };
};

export const listLeadsQuerySchema: Parser<LeadListQuery> = (value) => {
  const obj = asObject(value);
  if (!obj) return { success: false, errors: ["query must be an object"] };
  const errors: string[] = [];
  const query: LeadListQuery = {};

  if (typeof obj.cursor === "string" && obj.cursor.trim()) query.cursor = obj.cursor;
  if (obj.limit !== undefined) {
    const limit = Number(obj.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) errors.push("limit must be integer 1..100");
    else query.limit = limit;
  }
  if (obj.status !== undefined) {
    if (!validStatuses.includes(obj.status as LeadStatus)) errors.push("status is invalid");
    else query.status = obj.status as LeadStatus;
  }
  if (obj.minScore !== undefined) {
    const minScore = Number(obj.minScore);
    if (!Number.isInteger(minScore) || minScore < 0 || minScore > 100) errors.push("minScore must be integer 0..100");
    else query.minScore = minScore;
  }
  if (obj.assignee !== undefined) {
    if (typeof obj.assignee !== "string" || obj.assignee.length < 2 || obj.assignee.length > 80) errors.push("assignee must be 2..80 chars");
    else query.assignee = obj.assignee;
  }
  if (obj.sortBy !== undefined) {
    if (obj.sortBy !== "createdAt" && obj.sortBy !== "score") errors.push("sortBy must be createdAt or score");
    else query.sortBy = obj.sortBy;
  }
  if (obj.sortOrder !== undefined) {
    if (obj.sortOrder !== "asc" && obj.sortOrder !== "desc") errors.push("sortOrder must be asc or desc");
    else query.sortOrder = obj.sortOrder;
  }

  if (errors.length) return { success: false, errors };
  return { success: true, data: query };
};
