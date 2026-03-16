import { Role } from "@birthub/database";
import { Router } from "express";
import type { Request } from "express";

import {
  RequireRole,
  requireAuthenticatedSession
} from "../../common/guards/index.js";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import {
  getDashboardAgentStatuses,
  getDashboardBillingSummary,
  getDashboardMetrics,
  getDashboardRecentTasks
} from "./service.js";

function requireContext(request: Request): {
  organizationId: string;
  tenantId: string;
} {
  if (!request.context.organizationId || !request.context.tenantId) {
    throw new ProblemDetailsError({
      detail: "A valid authenticated tenant context is required.",
      status: 401,
      title: "Unauthorized"
    });
  }

  return {
    organizationId: request.context.organizationId,
    tenantId: request.context.tenantId
  };
}

export function createDashboardRouter(): Router {
  const router = Router();

  router.use("/api/v1/dashboard", requireAuthenticatedSession, RequireRole(Role.ADMIN));

  router.get(
    "/api/v1/dashboard/metrics",
    asyncHandler(async (request, response) => {
      const { organizationId, tenantId } = requireContext(request);
      response.status(200).json(await getDashboardMetrics(organizationId, tenantId));
    })
  );

  router.get(
    "/api/v1/dashboard/agent-statuses",
    asyncHandler(async (request, response) => {
      const { organizationId, tenantId } = requireContext(request);
      response.status(200).json(await getDashboardAgentStatuses(organizationId, tenantId));
    })
  );

  router.get(
    "/api/v1/dashboard/recent-tasks",
    asyncHandler(async (request, response) => {
      const { organizationId, tenantId } = requireContext(request);
      response.status(200).json(await getDashboardRecentTasks(organizationId, tenantId));
    })
  );

  router.get(
    "/api/v1/dashboard/billing-summary",
    asyncHandler(async (request, response) => {
      const { organizationId, tenantId } = requireContext(request);
      response.status(200).json(await getDashboardBillingSummary(organizationId, tenantId));
    })
  );

  return router;
}
