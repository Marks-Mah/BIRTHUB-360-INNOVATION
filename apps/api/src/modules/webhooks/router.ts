import { createHmac } from "node:crypto";

import type { ApiConfig } from "@birthub/config";
import { prisma, Role, WebhookEndpointStatus, WorkflowTriggerType } from "@birthub/database";
import { Router } from "express";
import { z } from "zod";

import { RequireRole, requireAuthenticated } from "../../common/guards/index.js";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import { dedupeTriggerPayload } from "../workflows/runnerQueue.js";
import { runWorkflowNow } from "../workflows/service.js";
import {
  createTenantWebhookEndpoint,
  listTenantWebhookDeliveries,
  listTenantWebhookEndpoints,
  retryWebhookDelivery,
  updateTenantWebhookEndpoint
} from "./settings.service.js";

const webhookEndpointSchema = z
  .object({
    topics: z.array(z.string().trim().min(1)).min(1).max(25),
    url: z.string().url()
  })
  .strict();

const webhookEndpointUpdateSchema = z
  .object({
    status: z.nativeEnum(WebhookEndpointStatus).optional(),
    topics: z.array(z.string().trim().min(1)).min(1).max(25).optional(),
    url: z.string().url().optional()
  })
  .strict();

const deliveryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

export function createWebhooksRouter(config: ApiConfig): Router {
  const router = Router();

  router.post(
    "/webhooks/trigger/:id",
    asyncHandler(async (request, response) => {
      const workflowId = String(request.params.id ?? "");
      const workflow = await prisma.workflow.findUnique({
        where: {
          id: workflowId
        }
      });

      if (!workflow || workflow.triggerType !== WorkflowTriggerType.WEBHOOK) {
        throw new ProblemDetailsError({
          detail: "Webhook trigger not found.",
          status: 404,
          title: "Not Found"
        });
      }

      const payload = request.body as Record<string, unknown>;
      const signature = request.header("x-birthhub-signature");
      const expected = createHmac(
        "sha256",
        workflow.webhookSecret ?? config.JOB_HMAC_GLOBAL_SECRET
      )
        .update(JSON.stringify(payload))
        .digest("hex");

      if (!signature || signature !== expected) {
        throw new ProblemDetailsError({
          detail: "Invalid webhook signature.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const dedupeAccepted = await dedupeTriggerPayload(config, workflow.tenantId, payload);
      if (!dedupeAccepted) {
        response.status(200).json({
          deduplicated: true
        });
        return;
      }

      const execution = await runWorkflowNow(
        config,
        workflow.id,
        workflow.organizationId,
        {
          async: true,
          payload
        },
        WorkflowTriggerType.WEBHOOK
      );

      response.status(202).json({
        deduplicated: false,
        executionId: execution.executionId
      });
    })
  );

  router.get(
    "/api/v1/settings/webhooks",
    requireAuthenticated,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const tenantReference = request.context.tenantId;

      if (!tenantReference) {
        throw new ProblemDetailsError({
          detail: "Active tenant context is required.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const items = await listTenantWebhookEndpoints(tenantReference);
      response.status(200).json({
        items,
        requestId: request.context.requestId
      });
    })
  );

  router.post(
    "/api/v1/settings/webhooks",
    requireAuthenticated,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const tenantReference = request.context.tenantId;

      if (!tenantReference) {
        throw new ProblemDetailsError({
          detail: "Active tenant context is required.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const payload = webhookEndpointSchema.parse(request.body);
      const endpoint = await createTenantWebhookEndpoint({
        createdByUserId: request.context.userId,
        tenantReference,
        topics: payload.topics,
        url: payload.url
      });

      response.status(201).json({
        endpoint,
        requestId: request.context.requestId
      });
    })
  );

  router.patch(
    "/api/v1/settings/webhooks/:id",
    requireAuthenticated,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const tenantReference = request.context.tenantId;

      if (!tenantReference) {
        throw new ProblemDetailsError({
          detail: "Active tenant context is required.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const payload = webhookEndpointUpdateSchema.parse(request.body);
      const endpoint = await updateTenantWebhookEndpoint({
        endpointId: String(request.params.id ?? ""),
        tenantReference,
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.topics !== undefined ? { topics: payload.topics } : {}),
        ...(payload.url !== undefined ? { url: payload.url } : {})
      });

      response.status(200).json({
        endpoint,
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/api/v1/settings/webhooks/:id/deliveries",
    requireAuthenticated,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const tenantReference = request.context.tenantId;

      if (!tenantReference) {
        throw new ProblemDetailsError({
          detail: "Active tenant context is required.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const query = deliveryQuerySchema.parse(request.query);
      const items = await listTenantWebhookDeliveries({
        endpointId: String(request.params.id ?? ""),
        limit: query.limit,
        tenantReference
      });

      response.status(200).json({
        items,
        requestId: request.context.requestId
      });
    })
  );

  router.post(
    "/api/v1/settings/webhooks/deliveries/:id/retry",
    requireAuthenticated,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const tenantReference = request.context.tenantId;

      if (!tenantReference) {
        throw new ProblemDetailsError({
          detail: "Active tenant context is required.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const result = await retryWebhookDelivery({
        config,
        deliveryId: String(request.params.id ?? ""),
        tenantReference
      });

      response.status(202).json({
        requestId: request.context.requestId,
        ...result
      });
    })
  );

  return router;
}
