import { Router } from "express";
import { z } from "zod";

import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import { budgetService } from "./budget.service.js";
import { BudgetExceededError } from "./budget.types.js";

const limitSchema = z.object({
  agentId: z.string().min(1),
  limit: z.number().positive()
});

export function createBudgetRouter(): Router {
  const router = Router();

  router.get(
    "/usage",
    asyncHandler(async (request, response) => {
      const tenantId = request.context.tenantId ?? "default-tenant";
      const usage = budgetService.getUsage(tenantId);

      response.status(200).json({
        requestId: request.context.requestId,
        ...usage
      });
    })
  );

  router.post(
    "/limits",
    asyncHandler(async (request, response) => {
      const tenantId = request.context.tenantId ?? "default-tenant";
      const payload = limitSchema.parse(request.body);

      const updated = budgetService.setLimit(tenantId, payload.agentId, payload.limit);

      response.status(200).json({
        record: updated,
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/estimate",
    asyncHandler(async (request, response) => {
      const agentId = (request.query.agentId as string | undefined) ?? "ceo-pack";
      const estimate = await budgetService.estimateCost(agentId);

      response.status(200).json({
        agentId,
        estimate,
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/export.csv",
    asyncHandler(async (request, response) => {
      const tenantId = request.context.tenantId ?? "default-tenant";
      const csv = budgetService.exportUsageCsv(tenantId);

      response.setHeader("content-type", "text/csv; charset=utf-8");
      response.setHeader("content-disposition", "attachment; filename=budget-usage.csv");
      response.status(200).send(csv);
    })
  );

  router.post(
    "/consume",
    asyncHandler(async (request, response) => {
      const tenantId = request.context.tenantId ?? "default-tenant";

      const payload = z
        .object({
          agentId: z.string().min(1),
          costBRL: z.number().nonnegative(),
          executionMode: z.enum(["LIVE", "DRY_RUN"]).default("LIVE")
        })
        .parse(request.body);

      try {
        const record = budgetService.consumeBudget({
          agentId: payload.agentId,
          costBRL: payload.costBRL,
          executionMode: payload.executionMode,
          tenantId
        });

        response.status(200).json({
          record,
          requestId: request.context.requestId
        });
      } catch (error) {
        if (error instanceof BudgetExceededError) {
          throw new ProblemDetailsError({
            detail: `Budget exhausted for agent ${error.agentId}.`,
            status: 402,
            title: "Budget Exceeded"
          });
        }

        throw error;
      }
    })
  );

  return router;
}
