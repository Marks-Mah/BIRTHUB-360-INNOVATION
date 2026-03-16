import { Router } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../auth.js";
import { requireJwt } from "../auth.js";
import { createLogger } from "../lib/logger.js";

export const apiV1Router = Router();
export const router = Router();

const logger = createLogger({ service: "api-gateway", surface: "supported" });
const organizationPlans = new Map<string, "STARTER" | "PRO" | "ENTERPRISE">();
const activityStatus = new Map<string, string>();
const createLeadSchema = z.object({
  assignee: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(120),
  score: z.number().int().min(0).max(100),
  status: z.enum(["NEW", "QUALIFIED", "CONTACTED", "LOST"])
});

function validationErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });
}

function resolveTenantId(req: AuthenticatedRequest): string {
  if (typeof req.auth?.tenantId === "string" && req.auth.tenantId.trim()) {
    return req.auth.tenantId;
  }
  return "tenant_unknown";
}

apiV1Router.post("/leads", requireJwt, (req, res) => {
  const parsed = createLeadSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Invalid request body",
      details: { errors: validationErrors(parsed.error) }
    });
  }

  const tenantId = resolveTenantId(req as AuthenticatedRequest);
  const lead = {
    id: `lead_${Math.random().toString(36).slice(2, 11)}`,
    tenantId,
    ...parsed.data
  };

  logger.info("lead-created", {
    leadId: lead.id,
    tenantId,
    source: req.header("x-source") ?? "manual"
  });

  return res.status(201).json(lead);
});

apiV1Router.patch("/internal/organizations/:id/plan", (req, res) => {
  const candidate = typeof req.body?.plan === "string" ? req.body.plan.toUpperCase() : "";
  if (candidate !== "STARTER" && candidate !== "PRO" && candidate !== "ENTERPRISE") {
    return res.status(400).json({
      code: "INVALID_PLAN",
      message: "Plan must be STARTER, PRO or ENTERPRISE"
    });
  }

  organizationPlans.set(req.params.id, candidate);
  return res.json({ id: req.params.id, plan: candidate, updated: true });
});

apiV1Router.get("/internal/organizations/:id/plan", (req, res) => {
  res.json({ id: req.params.id, plan: organizationPlans.get(req.params.id) ?? "STARTER" });
});

apiV1Router.patch("/internal/activities/:id", (req, res) => {
  const status = typeof req.body?.status === "string" ? req.body.status : "UNKNOWN";
  activityStatus.set(req.params.id, status);
  return res.json({ id: req.params.id, status, updated: true });
});

apiV1Router.get("/internal/activities/:id", (req, res) => {
  res.json({ id: req.params.id, status: activityStatus.get(req.params.id) ?? "UNKNOWN" });
});
