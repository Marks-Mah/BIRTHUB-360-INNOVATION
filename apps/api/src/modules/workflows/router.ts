import { createHmac } from "node:crypto";

import type { ApiConfig } from "@birthub/config";
import { prisma, Role, WorkflowTriggerType } from "@birthub/database";
import type { Request } from "express";
import { Router } from "express";

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

async function assertAdminRole(request: Request): Promise<void> {
  const tenantId = requireTenantId(request);
  const userId = request.context.userId;

  if (!userId) {
    throw new ProblemDetailsError({
      detail: "Authenticated user is required for this operation.",
      status: 401,
      title: "Unauthorized"
    });
  }

  const membership = await prisma.membership.findFirst({
    where: {
      role: {
        in: [Role.ADMIN, Role.OWNER]
      },
      tenantId,
      userId
    }
  });

  if (!membership) {
    throw new ProblemDetailsError({
      detail: "Admin or owner role is required for this operation.",
      status: 403,
      title: "Forbidden"
    });
  }
}

export function createWorkflowsRouter(config: ApiConfig): Router {
  const router = Router();

  router.get(
    "/api/v1/workflows",
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
    validateBody(workflowCreateSchema),
    asyncHandler(async (request, response) => {
      await assertAdminRole(request);
      const tenantId = requireTenantId(request);

      const workflow = await createWorkflow(config, tenantId, request.body);
      response.status(201).json({
        requestId: request.context.requestId,
        workflow
      });
    })
  );

  router.get(
    "/api/v1/workflows/:id",
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
    validateBody(workflowUpdateSchema),
    asyncHandler(async (request, response) => {
      await assertAdminRole(request);
      const tenantId = requireTenantId(request);
      const workflowId = String(request.params.id ?? "");

      const workflow = await updateWorkflow(
        config,
        workflowId,
        tenantId,
        request.body
      );
      response.status(200).json({
        requestId: request.context.requestId,
        workflow
      });
    })
  );

  router.delete(
    "/api/v1/workflows/:id",
    asyncHandler(async (request, response) => {
      await assertAdminRole(request);
      const tenantId = requireTenantId(request);
      const workflowId = String(request.params.id ?? "");

      await archiveWorkflow(workflowId, tenantId);
      response.status(204).send();
    })
  );

  router.post(
    "/api/v1/workflows/:id/run",
    validateBody(workflowRunSchema),
    asyncHandler(async (request, response) => {
      await assertAdminRole(request);
      const tenantId = requireTenantId(request);
      const workflowId = String(request.params.id ?? "");

      try {
        const result = await runWorkflowNow(
          config,
          workflowId,
          tenantId,
          request.body,
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
    asyncHandler(async (request, response) => {
      await assertAdminRole(request);
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
    asyncHandler(async (request, response) => {
      await assertAdminRole(request);
      const tenantId = requireTenantId(request);
      const topic = String(request.params.topic ?? "");

      const organization = await prisma.organization.findFirst({
        where: {
          OR: [{ id: tenantId }, { tenantId }]
        }
      });

      if (!organization) {
        throw new ProblemDetailsError({
          detail: "Organization not found.",
          status: 404,
          title: "Not Found"
        });
      }

      emitWorkflowInternalEvent({
        payload: (request.body ?? {}) as Record<string, unknown>,
        tenantId: organization.tenantId,
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
