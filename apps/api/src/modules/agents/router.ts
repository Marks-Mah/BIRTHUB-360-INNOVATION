import { Router } from "express";
import { z } from "zod";

import { sendEtaggedJson } from "../../common/cache/index.js";
import {
  RequireFeature,
  RequireRole,
  requireAuthenticatedSession
} from "../../common/guards/index.js";
import { Role } from "@birthub/database";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import { requireStringValue } from "../../lib/request-values.js";
import { agentMetricsService } from "./metrics.service.js";
import { installedAgentsService } from "./service.js";

const runPayloadSchema = z.record(z.string(), z.unknown()).catch({});
const policyUpsertSchema = z
  .object({
    actions: z.array(z.string().min(1)).min(1),
    effect: z.enum(["allow", "deny"]),
    enabled: z.boolean().optional(),
    name: z.string().min(1),
    policyId: z.string().min(1).optional(),
    reason: z.string().min(1).optional()
  })
  .strict();
const policyPatchSchema = policyUpsertSchema
  .partial()
  .extend({
    actions: z.array(z.string().min(1)).min(1).optional()
  })
  .strict();
const policyTemplateSchema = z
  .object({
    replaceExisting: z.boolean().optional(),
    template: z.enum(["admin", "readonly", "standard"])
  })
  .strict();

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveTenantReference(input: {
  contextTenantId?: string | null;
}): string {
  const candidate = input.contextTenantId;

  if (!candidate || !candidate.trim()) {
    throw new ProblemDetailsError({
      detail: "Tenant context is required for installed-agent operations.",
      status: 400,
      title: "Bad Request"
    });
  }

  return candidate;
}

export function createInstalledAgentsRouter(): Router {
  const router = Router();

  router.get(
    "/installed",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    RequireFeature("agents"),
    asyncHandler(async (request, response) => {
      const tenantReference = resolveTenantReference({
        contextTenantId: request.context.tenantId
      });
      const agents = await installedAgentsService.listInstalledAgents(tenantReference);

      sendEtaggedJson(request, response, {
        agents,
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/installed/:installedAgentId",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    RequireFeature("agents"),
    asyncHandler(async (request, response) => {
      const tenantReference = resolveTenantReference({
        contextTenantId: request.context.tenantId
      });
      const installedAgentId = requireStringValue(
        request.params.installedAgentId,
        "installedAgentId is required."
      );
      const agent = await installedAgentsService.getInstalledAgent({
        installedAgentId,
        tenantReference
      });

      sendEtaggedJson(request, response, {
        agent,
        requestId: request.context.requestId
      });
    })
  );

  router.post(
    "/installed/:installedAgentId/run",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    RequireFeature("agents"),
    asyncHandler(async (request, response) => {
      const tenantReference = resolveTenantReference({
        contextTenantId: request.context.tenantId
      });
      const userId = requireStringValue(
        request.context.userId,
        "Authenticated user context is required to run installed agents."
      );
      const payload = runPayloadSchema.parse(request.body ?? {});
      const installedAgentId = requireStringValue(
        request.params.installedAgentId,
        "installedAgentId is required."
      );
      const result = await installedAgentsService.runInstalledAgent({
        installedAgentId,
        payload,
        tenantReference,
        userId
      });

      response.status(202).json({
        catalogAgentId: result.catalogAgentId,
        executionId: result.executionId,
        mode: result.mode,
        reused: result.reused,
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/installed/:installedAgentId/policies",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    RequireFeature("agents"),
    asyncHandler(async (request, response) => {
      const tenantReference = resolveTenantReference({
        contextTenantId: request.context.tenantId
      });
      const installedAgentId = requireStringValue(
        request.params.installedAgentId,
        "installedAgentId is required."
      );
      const policies = await installedAgentsService.listInstalledAgentPolicies({
        installedAgentId,
        tenantReference
      });

      response.status(200).json({
        policies,
        requestId: request.context.requestId
      });
    })
  );

  router.post(
    "/installed/:installedAgentId/policies",
    requireAuthenticatedSession,
    RequireRole(Role.OWNER),
    RequireFeature("agents"),
    asyncHandler(async (request, response) => {
      const tenantReference = resolveTenantReference({
        contextTenantId: request.context.tenantId
      });
      const userId = requireStringValue(
        request.context.userId,
        "Authenticated user context is required to manage policies."
      );
      const installedAgentId = requireStringValue(
        request.params.installedAgentId,
        "installedAgentId is required."
      );
      const payload = policyUpsertSchema.parse(request.body ?? {});
      const policy = await installedAgentsService.upsertInstalledAgentPolicy({
        actions: payload.actions,
        effect: payload.effect,
        ...(payload.enabled !== undefined ? { enabled: payload.enabled } : {}),
        installedAgentId,
        name: payload.name,
        ...(payload.policyId ? { policyId: payload.policyId } : {}),
        ...(payload.reason ? { reason: payload.reason } : {}),
        tenantReference,
        userId
      });

      response.status(201).json({
        policy,
        requestId: request.context.requestId
      });
    })
  );

  router.patch(
    "/installed/:installedAgentId/policies/:policyId",
    requireAuthenticatedSession,
    RequireRole(Role.OWNER),
    RequireFeature("agents"),
    asyncHandler(async (request, response) => {
      const tenantReference = resolveTenantReference({
        contextTenantId: request.context.tenantId
      });
      const userId = requireStringValue(
        request.context.userId,
        "Authenticated user context is required to manage policies."
      );
      const installedAgentId = requireStringValue(
        request.params.installedAgentId,
        "installedAgentId is required."
      );
      const policyId = requireStringValue(request.params.policyId, "policyId is required.");
      const payload = policyPatchSchema.parse(request.body ?? {});
      const policy = await installedAgentsService.patchInstalledAgentPolicy({
        installedAgentId,
        policyId,
        ...(payload.actions !== undefined ? { actions: payload.actions } : {}),
        ...(payload.effect !== undefined ? { effect: payload.effect } : {}),
        ...(payload.enabled !== undefined ? { enabled: payload.enabled } : {}),
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.reason !== undefined ? { reason: payload.reason } : {}),
        tenantReference,
        userId
      });

      response.status(200).json({
        policy,
        requestId: request.context.requestId
      });
    })
  );

  router.post(
    "/installed/:installedAgentId/policies/templates",
    requireAuthenticatedSession,
    RequireRole(Role.OWNER),
    RequireFeature("agents"),
    asyncHandler(async (request, response) => {
      const tenantReference = resolveTenantReference({
        contextTenantId: request.context.tenantId
      });
      const userId = requireStringValue(
        request.context.userId,
        "Authenticated user context is required to manage policies."
      );
      const installedAgentId = requireStringValue(
        request.params.installedAgentId,
        "installedAgentId is required."
      );
      const payload = policyTemplateSchema.parse(request.body ?? {});
      const managedPolicies = await installedAgentsService.applyPolicyTemplate({
        installedAgentId,
        ...(payload.replaceExisting !== undefined ? { replaceExisting: payload.replaceExisting } : {}),
        tenantReference,
        template: payload.template,
        userId
      });

      response.status(200).json({
        managedPolicies,
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/installed/:installedAgentId/metrics",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    RequireFeature("agents"),
    asyncHandler(async (request, response) => {
      const tenantReference = resolveTenantReference({
        contextTenantId: request.context.tenantId
      });
      const installedAgentId = requireStringValue(
        request.params.installedAgentId,
        "installedAgentId is required."
      );
      await installedAgentsService.getInstalledAgent({
        installedAgentId,
        tenantReference
      });
      const windowMinutes = Number(request.query.windowMinutes ?? 60);
      const metrics = await agentMetricsService.getMetrics({
        agentId: installedAgentId,
        tenantId: tenantReference,
        windowMinutes: Number.isFinite(windowMinutes) ? windowMinutes : 60
      });

      response.status(200).json({
        metrics,
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/installed/:installedAgentId/run/stream",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    RequireFeature("agents"),
    asyncHandler(async (request, response) => {
      const executionId = requireStringValue(
        request.query.executionId,
        "executionId is required for replay stream."
      );

      const tenantReference = resolveTenantReference({
        contextTenantId: request.context.tenantId
      });
      const installedAgentId = requireStringValue(
        request.params.installedAgentId,
        "installedAgentId is required."
      );
      response.setHeader("Cache-Control", "no-cache, no-transform");
      response.setHeader("Connection", "keep-alive");
      response.setHeader("Content-Type", "text/event-stream");
      response.flushHeaders?.();

      let sentLogs = 0;
      let replay = await installedAgentsService.getExecutionReplay({
        executionId,
        installedAgentId,
        tenantReference
      });

      for (let attempt = 0; attempt < 120; attempt += 1) {
        replay.logs.slice(sentLogs).forEach((message, index) => {
          response.write(`event: log\n`);
          response.write(
            `data: ${JSON.stringify({ index: sentLogs + index, message })}\n\n`
          );
        });
        sentLogs = replay.logs.length;

        if (replay.status !== "RUNNING") {
          response.write(`event: done\n`);
          response.write(
            `data: ${JSON.stringify({
              executionId: replay.executionId,
              output: replay.output,
              status: replay.status,
              totalLogs: replay.logs.length
            })}\n\n`
          );
          response.end();
          return;
        }

        await wait(1000);
        replay = await installedAgentsService.getExecutionReplay({
          executionId,
          installedAgentId,
          tenantReference
        });
      }

      response.write(`event: done\n`);
      response.write(
        `data: ${JSON.stringify({
          executionId: replay.executionId,
          output: replay.output,
          status: replay.status,
          timedOut: true,
          totalLogs: replay.logs.length
        })}\n\n`
      );
      response.end();
    })
  );

  return router;
}
