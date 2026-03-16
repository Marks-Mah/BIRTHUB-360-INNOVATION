import { Role } from "@birthub/database";
import { Router } from "express";
import { z } from "zod";

import {
  RequireRole,
  requireAuthenticatedSession
} from "../../common/guards/index.js";
import { asyncHandler } from "../../lib/problem-details.js";
import {
  exportBillingCsv,
  getCsRiskAccounts,
  getGlobalAgentPerformance,
  getActiveTenantsMetrics,
  getCohortMetrics,
  getExecutiveMetrics,
  getMasterAdminDashboard,
  getOperationsDashboard,
  getQualityReport,
  getUsageMetrics
} from "./service.js";

const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

export function createAnalyticsRouter(): Router {
  const router = Router();

  router.get(
    "/usage",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const range = dateRangeSchema.parse(request.query);
      const usage = await getUsageMetrics({
        ...(range.from ? { from: new Date(range.from) } : {}),
        ...(range.to ? { to: new Date(range.to) } : {})
      });

      response.status(200).json({
        items: usage,
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/executive",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      response.status(200).json({
        metrics: await getExecutiveMetrics(),
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/cohort",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      response.status(200).json({
        items: await getCohortMetrics(),
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/billing/export",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const range = dateRangeSchema.parse(request.query);
      const csv = await exportBillingCsv({
        ...(range.from ? { from: new Date(range.from) } : {}),
        ...(range.to ? { to: new Date(range.to) } : {})
      });

      response.setHeader("Content-Disposition", 'attachment; filename="billing-export.csv"');
      response.type("text/csv").send(csv);
    })
  );

  router.get(
    "/active-tenants",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      response.status(200).json({
        metrics: await getActiveTenantsMetrics(),
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/cs-risk",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      response.status(200).json({
        items: await getCsRiskAccounts(),
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/quality-report",
    requireAuthenticatedSession,
    RequireRole(Role.SUPER_ADMIN),
    asyncHandler(async (request, response) => {
      response.status(200).json({
        items: await getQualityReport(),
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/agent-performance",
    requireAuthenticatedSession,
    RequireRole(Role.SUPER_ADMIN),
    asyncHandler(async (request, response) => {
      response.status(200).json({
        metrics: await getGlobalAgentPerformance(),
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/master-dashboard",
    requireAuthenticatedSession,
    RequireRole(Role.SUPER_ADMIN),
    asyncHandler(async (request, response) => {
      response.status(200).json({
        metrics: await getMasterAdminDashboard(),
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/operations",
    requireAuthenticatedSession,
    RequireRole(Role.SUPER_ADMIN),
    asyncHandler(async (request, response) => {
      response.status(200).json({
        metrics: await getOperationsDashboard(),
        requestId: request.context.requestId
      });
    })
  );

  return router;
}
