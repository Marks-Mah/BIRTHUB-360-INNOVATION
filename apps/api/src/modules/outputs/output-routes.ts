import { Router } from "express";
import { z } from "zod";
import { Role } from "@birthub/database";

import {
  RequireRole,
  requireAuthenticatedSession
} from "../../common/guards/index.js";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import { readFirstString, requireStringValue } from "../../lib/request-values.js";
import { outputService } from "./output.service.js";

export function createOutputRouter(): Router {
  const router = Router();

  router.get(
    "/",
    requireAuthenticatedSession,
    asyncHandler(async (request, response) => {
      const tenantId = request.context.tenantId;

      if (!tenantId) {
        throw new ProblemDetailsError({
          detail: "A valid authenticated session is required.",
          status: 401,
          title: "Unauthorized"
        });
      }
      const requestedType = readFirstString(request.query.type);
      const executionId = readFirstString(request.query.executionId);
      const type =
        requestedType === "executive-report" || requestedType === "technical-log"
          ? requestedType
          : undefined;

      const outputs = executionId
        ? await outputService.listByExecution(tenantId, executionId)
        : await outputService.listByTenant(tenantId, type);

      response.status(200).json({
        outputs,
        requestId: request.context.requestId
      });
    })
  );

  router.post(
    "/",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const tenantId = request.context.tenantId;
      const organizationId = request.context.organizationId;
      const createdByUserId = request.context.userId;

      if (!tenantId || !organizationId || !createdByUserId) {
        throw new ProblemDetailsError({
          detail: "A valid authenticated session is required.",
          status: 401,
          title: "Unauthorized"
        });
      }
      const payload = z
        .object({
          agentId: z.string().min(1),
          content: z.string().min(1),
          requireApproval: z.boolean().optional(),
          type: z.enum(["executive-report", "technical-log"])
        })
        .parse(request.body);

      const created = await outputService.createOutput({
        agentId: payload.agentId,
        content: payload.content,
        createdByUserId,
        organizationId,
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
    requireAuthenticatedSession,
    asyncHandler(async (request, response) => {
      const tenantId = request.context.tenantId;

      if (!tenantId) {
        throw new ProblemDetailsError({
          detail: "A valid authenticated session is required.",
          status: 401,
          title: "Unauthorized"
        });
      }
      const outputId = requireStringValue(request.params.outputId, "A valid output id is required.");
      const output = await outputService.getById(outputId, tenantId);

      if (!output) {
        throw new ProblemDetailsError({
          detail: `Output ${outputId} not found.`,
          status: 404,
          title: "Output Not Found"
        });
      }

      const integrity = await outputService.verifyIntegrity(outputId, tenantId);

      response.status(200).json({
        integrity,
        output,
        requestId: request.context.requestId
      });
    })
  );

  router.post(
    "/:outputId/approve",
    requireAuthenticatedSession,
    RequireRole(Role.OWNER),
    asyncHandler(async (request, response) => {
      const tenantId = request.context.tenantId;
      const approvedByUserId = request.context.userId;

      if (!tenantId || !approvedByUserId) {
        throw new ProblemDetailsError({
          detail: "A valid authenticated session is required.",
          status: 401,
          title: "Unauthorized"
        });
      }
      const outputId = requireStringValue(request.params.outputId, "A valid output id is required.");
      const approved = await outputService.approve(outputId, tenantId, approvedByUserId);

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
    requireAuthenticatedSession,
    asyncHandler(async (request, response) => {
      const tenantId = request.context.tenantId;

      if (!tenantId) {
        throw new ProblemDetailsError({
          detail: "A valid authenticated session is required.",
          status: 401,
          title: "Unauthorized"
        });
      }
      const outputId = requireStringValue(request.params.outputId, "A valid output id is required.");
      const output = await outputService.getById(outputId, tenantId);

      if (!output) {
        throw new ProblemDetailsError({
          detail: `Output ${outputId} not found.`,
          status: 404,
          title: "Output Not Found"
        });
      }

      const integrity = await outputService.verifyIntegrity(outputId, tenantId);

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
    requireAuthenticatedSession,
    RequireRole(Role.OWNER),
    asyncHandler(async (request, response) => {
      const deleted = await outputService.prune();

      response.status(200).json({
        deleted,
        requestId: request.context.requestId
      });
    })
  );

  return router;
}
