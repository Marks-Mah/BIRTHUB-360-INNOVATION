import { Router } from "express";
import { z } from "zod";

import { sendEtaggedJson } from "../../common/cache/index.js";
import { RequireFeature } from "../../common/guards/index.js";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import { requireStringValue } from "../../lib/request-values.js";
import { installedAgentsService } from "./service.js";

const runPayloadSchema = z.record(z.string(), z.unknown()).catch({});

function resolveTenantReference(input: {
  bodyTenantId?: unknown;
  contextTenantId?: string | null;
  queryTenantId?: unknown;
}): string {
  const candidate =
    input.contextTenantId ??
    (typeof input.bodyTenantId === "string" ? input.bodyTenantId : null) ??
    (typeof input.queryTenantId === "string" ? input.queryTenantId : null) ??
    "birthhub-alpha";

  if (!candidate.trim()) {
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
    RequireFeature("agents"),
    asyncHandler(async (request, response) => {
      const tenantReference = resolveTenantReference({
        bodyTenantId: request.body?.tenantId,
        contextTenantId: request.context.tenantId
      });
      const payload = runPayloadSchema.parse(request.body ?? {});
      const installedAgentId = requireStringValue(
        request.params.installedAgentId,
        "installedAgentId is required."
      );
      const result = await installedAgentsService.runInstalledAgent({
        installedAgentId,
        payload,
        tenantReference,
        userId: request.context.userId
      });

      response.status(201).json({
        catalogAgentId: result.catalogAgentId,
        executionId: result.executionId,
        learningRecordId: result.learningRecordId,
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/installed/:installedAgentId/run/stream",
    asyncHandler(async (request, response) => {
      const executionId = String(request.query.executionId ?? "");

      if (!executionId.trim()) {
        throw new ProblemDetailsError({
          detail: "executionId is required for replay stream.",
          status: 400,
          title: "Bad Request"
        });
      }

      const tenantReference = resolveTenantReference({
        contextTenantId: request.context.tenantId,
        queryTenantId: request.query.tenantId
      });
      const installedAgentId = requireStringValue(
        request.params.installedAgentId,
        "installedAgentId is required."
      );
      const replay = await installedAgentsService.getExecutionReplay({
        executionId,
        installedAgentId,
        tenantReference
      });

      response.setHeader("Cache-Control", "no-cache, no-transform");
      response.setHeader("Connection", "keep-alive");
      response.setHeader("Content-Type", "text/event-stream");
      response.flushHeaders?.();

      replay.logs.forEach((message, index) => {
        response.write(`event: log\n`);
        response.write(`data: ${JSON.stringify({ index, message })}\n\n`);
      });

      response.write(`event: done\n`);
      response.write(`data: ${JSON.stringify({ executionId: replay.executionId, totalLogs: replay.logs.length })}\n\n`);
      response.end();
    })
  );

  return router;
}
