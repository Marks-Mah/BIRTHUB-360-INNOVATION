import { createHmac } from "node:crypto";

import type { ApiConfig } from "@birthub/config";
import { Role, WorkflowTriggerType } from "@birthub/database";
import type { Request } from "express";
import { Router } from "express";

import {
  RequireRole,
  requireAuthenticatedSession
} from "../../common/guards/index.js";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import { validateBody } from "../../middleware/validate-body.js";
import { emitWorkflowInternalEvent } from "../webhooks/eventBus.js";
import {
  workflowCreateSchema,
  workflowRunSchema,
  workflowUpdateSchema
} from "./schemas.js";
import {
  archiveWorkflow,
  createWorkflow,
  getWorkflowById,
  listWorkflows,
  runWorkflowNow,
  updateWorkflow
} from "./service.js";

function requireTenantId(request: Request): string {
  const tenantId = request.context.tenantId;
  if (!tenantId) {
    throw new ProblemDetailsError({
      detail: "Tenant context is required.",
      status: 401,
      title: "Unauthorized"
    });
  }

  return tenantId;
}

export function createWorkflowsRouter(config: ApiConfig): Router {
  const router = Router();

  router.get(
    "/api/v1/workflows",
    requireAuthenticatedSession,
    asyncHandler(async (request, response) => {
      const tenantId = requireTenantId(request);

      const items = await listWorkflows(tenantId);
      response.status(200).json({
        items,
        requestId: request.context.requestId
      });
    })
  );

  router.post(
    "/api/v1/workflows",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    validateBody(workflowCreateSchema),
    asyncHandler(async (request, response) => {
      const tenantId = requireTenantId(request);
      const payload = workflowCreateSchema.parse(request.body);

      const workflow = await createWorkflow(config, tenantId, payload);
      response.status(201).json({
        requestId: request.context.requestId,
        workflow
      });
    })
  );

  router.get(
    "/api/v1/workflows/:id",
    requireAuthenticatedSession,
    asyncHandler(async (request, response) => {
      const tenantId = requireTenantId(request);
      const workflowId = String(request.params.id ?? "");

      const workflow = await getWorkflowById(workflowId, tenantId);
      if (!workflow) {
        throw new ProblemDetailsError({
          detail: "Workflow not found.",
          status: 404,
          title: "Not Found"
        });
      }

      response.status(200).json({
        requestId: request.context.requestId,
        workflow
      });
    })
  );

  router.put(
    "/api/v1/workflows/:id",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    validateBody(workflowUpdateSchema),
    asyncHandler(async (request, response) => {
      const tenantId = requireTenantId(request);
      const workflowId = String(request.params.id ?? "");

      const workflow = await updateWorkflow(
        config,
        workflowId,
        tenantId,
        workflowUpdateSchema.parse(request.body)
      );
      response.status(200).json({
        requestId: request.context.requestId,
        workflow
      });
    })
  );

  router.delete(
    "/api/v1/workflows/:id",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const tenantId = requireTenantId(request);
      const workflowId = String(request.params.id ?? "");

      await archiveWorkflow(workflowId, tenantId);
      response.status(204).send();
    })
  );

  router.post(
    "/api/v1/workflows/:id/run",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    validateBody(workflowRunSchema),
    asyncHandler(async (request, response) => {
      const tenantId = requireTenantId(request);
      const workflowId = String(request.params.id ?? "");

      try {
        const result = await runWorkflowNow(
          config,
          workflowId,
          tenantId,
          workflowRunSchema.parse(request.body),
          WorkflowTriggerType.MANUAL
        );
        response.status(result.mode === "async" ? 202 : 200).json({
          requestId: request.context.requestId,
          ...result
        });
      } catch (error) {
        if (error instanceof Error && error.message === "WORKFLOW_NOT_PUBLISHED") {
          throw new ProblemDetailsError({
            detail: "Only published workflows can be executed.",
            status: 409,
            title: "Conflict"
          });
        }

        throw error;
      }
    })
  );

  router.get(
    "/api/v1/workflows/:id/webhook-url",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const tenantId = requireTenantId(request);
      const workflowId = String(request.params.id ?? "");

      const workflow = await getWorkflowById(workflowId, tenantId);
      if (!workflow || workflow.triggerType !== WorkflowTriggerType.WEBHOOK) {
        throw new ProblemDetailsError({
          detail: "Webhook workflow not found.",
          status: 404,
          title: "Not Found"
        });
      }

      const host = request.header("x-forwarded-host") ?? request.header("host") ?? "localhost:3000";
      const protocol = request.header("x-forwarded-proto") ?? "http";
      const webhookUrl = `${protocol}://${host}/webhooks/trigger/${workflow.id}`;

      const signatureSeed = JSON.stringify({ hello: "world" });
      const sampleSignature = createHmac(
        "sha256",
        workflow.webhookSecret ?? config.JOB_HMAC_GLOBAL_SECRET
      )
        .update(signatureSeed)
        .digest("hex");

      response.status(200).json({
        requestId: request.context.requestId,
        sampleSignature,
        webhookUrl
      });
    })
  );

  router.post(
    "/api/v1/workflows/events/:topic",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const tenantId = requireTenantId(request);
      const topic = String(request.params.topic ?? "");

      emitWorkflowInternalEvent({
        payload: (request.body ?? {}) as Record<string, unknown>,
        tenantId,
        topic
      });

      response.status(202).json({
        accepted: true,
        requestId: request.context.requestId,
        topic
      });
    })
  );

  return router;
}
