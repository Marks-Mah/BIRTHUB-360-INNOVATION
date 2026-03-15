import type { LeadStatus, UpdateLeadInput } from "../repositories/lead-repository.js";
import { createZodParser, type Parser } from "../middleware/validate.js";
import { z } from "zod";

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

export const createLeadBodyZodSchema = z.object({
  assignee: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(120),
  score: z.number().int().min(0).max(100),
  status: z.enum(validStatuses)
});

export const createLeadBodySchema = createZodParser(createLeadBodyZodSchema);

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
