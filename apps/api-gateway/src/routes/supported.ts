import { Router } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../auth.js";
import { requireInternalServiceToken, requireJwt } from "../auth.js";
import { createLogger } from "../lib/logger.js";
import { internalStateStore, type SupportedPlan } from "./internal-state-store.js";

export const apiV1Router = Router();
export const router = Router();

const logger = createLogger({ service: "api-gateway", surface: "supported" });
const LEGACY_AGENT_LOGS_DEPRECATED_AT = "2026-03-17";
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

function requireTenantId(req: AuthenticatedRequest): string {
  if (typeof req.auth?.tenantId === "string" && req.auth.tenantId.trim()) {
    return req.auth.tenantId;
  }

  throw new Error("missing_tenant_claim");
}

function requireRouteId(value: string | string[] | undefined): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  throw new Error("missing_route_id");
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

  let tenantId: string;

  try {
    tenantId = requireTenantId(req as AuthenticatedRequest);
  } catch {
    return res.status(403).json({
      code: "MISSING_TENANT_CLAIM",
      message: "tenantId is required in the verified JWT payload"
    });
  }

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

apiV1Router.patch("/internal/organizations/:id/plan", requireInternalServiceToken, async (req, res) => {
  const organizationId = requireRouteId(req.params.id);
  const candidate = typeof req.body?.plan === "string" ? req.body.plan.toUpperCase() : "";
  if (candidate !== "STARTER" && candidate !== "PRO" && candidate !== "ENTERPRISE") {
    return res.status(400).json({
      code: "INVALID_PLAN",
      message: "Plan must be STARTER, PRO or ENTERPRISE"
    });
  }

  const plan = await internalStateStore.setOrganizationPlan(organizationId, candidate as SupportedPlan);
  return res.json({ id: organizationId, plan, updated: true });
});

apiV1Router.get("/internal/organizations/:id/plan", requireInternalServiceToken, async (req, res) => {
  const organizationId = requireRouteId(req.params.id);
  const plan = await internalStateStore.getOrganizationPlan(organizationId);
  res.json({ id: organizationId, plan: plan ?? "STARTER" });
});

apiV1Router.patch("/internal/activities/:id", requireInternalServiceToken, async (req, res) => {
  const activityId = requireRouteId(req.params.id);
  const status = typeof req.body?.status === "string" ? req.body.status : "UNKNOWN";
  const nextStatus = await internalStateStore.setActivityStatus(activityId, status);
  return res.json({ id: activityId, status: nextStatus, updated: true });
});

apiV1Router.get("/internal/activities/:id", requireInternalServiceToken, async (req, res) => {
  const activityId = requireRouteId(req.params.id);
  const status = await internalStateStore.getActivityStatus(activityId);
  res.json({ id: activityId, status: status ?? "UNKNOWN" });
});

router.get("/agents/logs", (_req, res) => {
  const payload = {
    code: "LEGACY_AGENT_LOGS_DEPRECATED",
    message:
      "GET /agents/logs is deprecated. Agent logs moved to canonical multi-tenant telemetry services.",
    deprecatedAt: LEGACY_AGENT_LOGS_DEPRECATED_AT,
    replacement: "Use canonical telemetry APIs behind apps/api."
  } as const;

  logger.warn("legacy-route-deprecated", payload);
  res.status(410).json(payload);
});
