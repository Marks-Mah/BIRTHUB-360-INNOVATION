import { Router } from "express";
import { z } from "zod";

import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import { readFirstString, requireStringValue } from "../../lib/request-values.js";
import { outputService } from "./output.service.js";

export function createOutputRouter(): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (request, response) => {
      const tenantId = request.context.tenantId ?? "default-tenant";
      const requestedType = readFirstString(request.query.type);
      const type =
        requestedType === "executive-report" || requestedType === "technical-log"
          ? requestedType
          : undefined;

      const outputs = outputService.listByTenant(tenantId, type);

      response.status(200).json({
        outputs,
        requestId: request.context.requestId
      });
    })
  );

  router.post(
    "/",
    asyncHandler(async (request, response) => {
      const tenantId = request.context.tenantId ?? "default-tenant";
      const payload = z
        .object({
          agentId: z.string().min(1),
          content: z.string().min(1),
          requireApproval: z.boolean().optional(),
          type: z.enum(["executive-report", "technical-log"])
        })
        .parse(request.body);

      const created = outputService.createOutput({
        agentId: payload.agentId,
        content: payload.content,
        tenantId,
        type: payload.type,
        ...(payload.requireApproval !== undefined
          ? { requireApproval: payload.requireApproval }
          : {})
      });

      response.status(201).json({
        output: created,
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/:outputId",
    asyncHandler(async (request, response) => {
      const outputId = requireStringValue(request.params.outputId, "A valid output id is required.");
      const output = outputService.getById(outputId);

      if (!output) {
        throw new ProblemDetailsError({
          detail: `Output ${outputId} not found.`,
          status: 404,
          title: "Output Not Found"
        });
      }

      const integrity = outputService.verifyIntegrity(outputId);

      response.status(200).json({
        integrity,
        output,
        requestId: request.context.requestId
      });
    })
  );

  router.post(
    "/:outputId/approve",
    asyncHandler(async (request, response) => {
      const outputId = requireStringValue(request.params.outputId, "A valid output id is required.");
      const approved = outputService.approve(outputId);

      if (!approved) {
        throw new ProblemDetailsError({
          detail: `Output ${outputId} not found.`,
          status: 404,
          title: "Output Not Found"
        });
      }

      response.status(200).json({
        output: approved,
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/:outputId/export",
    asyncHandler(async (request, response) => {
      const outputId = requireStringValue(request.params.outputId, "A valid output id is required.");
      const output = outputService.getById(outputId);

      if (!output) {
        throw new ProblemDetailsError({
          detail: `Output ${outputId} not found.`,
          status: 404,
          title: "Output Not Found"
        });
      }

      const integrity = outputService.verifyIntegrity(outputId);

      if (!integrity?.isValid) {
        throw new ProblemDetailsError({
          detail: "Integrity verification failed. Output hash mismatch.",
          status: 409,
          title: "Integrity Violation"
        });
      }

      response.status(200).json({
        exported: {
          content: output.content,
          format: "markdown",
          outputId
        },
        requestId: request.context.requestId
      });
    })
  );

  router.post(
    "/prune",
    asyncHandler(async (request, response) => {
      const deleted = outputService.prune();

      response.status(200).json({
        deleted,
        requestId: request.context.requestId
      });
    })
  );

  return router;
}
