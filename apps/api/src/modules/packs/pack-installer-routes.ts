import { Router } from "express";
import { z } from "zod";

import { RequireFeature } from "../../common/guards/index.js";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import { requireStringValue } from "../../lib/request-values.js";
import { LimitExceededError } from "../billing/index.js";
import { packInstallerService } from "./pack-installer.service.js";

export function createPackInstallerRouter(): Router {
  const router = Router();

  router.post(
    "/install",
    RequireFeature("agents"),
    asyncHandler(async (request, response) => {
      const tenantId = request.context.tenantId ?? "default-tenant";
      const payload = z
        .object({
          activateAgents: z.boolean().default(true),
          agentId: z.string().min(1).optional(),
          connectors: z.record(z.string(), z.unknown()).default({}),
          packId: z.string().min(1).optional()
        })
        .refine((value) => Boolean(value.agentId ?? value.packId), {
          message: "agentId or packId is required."
        })
        .parse(request.body);

      let result: Awaited<ReturnType<typeof packInstallerService.installPackAtomic>>;

      try {
        result = await packInstallerService.installPackAtomic({
          activateAgents: payload.activateAgents,
          connectors: payload.connectors,
          tenantId,
          ...(payload.agentId ? { agentId: payload.agentId } : {}),
          ...(payload.packId ? { packId: payload.packId } : {})
        });
      } catch (error) {
        if (error instanceof LimitExceededError) {
          throw new ProblemDetailsError({
            detail: `Plano atual permite no máximo ${error.limit} agentes (${error.current} já criados).`,
            status: 402,
            title: "Payment Required"
          });
        }

        throw error;
      }

      response.status(201).json({
        requestId: request.context.requestId,
        ...result
      });
    })
  );

  router.post(
    "/uninstall",
    asyncHandler(async (request, response) => {
      const tenantId = request.context.tenantId ?? "default-tenant";
      const payload = z.object({ packId: z.string().min(1) }).parse(request.body);

      try {
        const result = await packInstallerService.uninstallPackAtomic({
          packId: payload.packId,
          tenantId
        });

        response.status(200).json({
          requestId: request.context.requestId,
          ...result
        });
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Cannot uninstall pack because it is being used by active workflows")) {
          throw new ProblemDetailsError({
            detail: error.message,
            status: 409,
            title: "Pack in Use"
          });
        }
        throw error;
      }
    })
  );

  router.get(
    "/status",
    asyncHandler(async (request, response) => {
      const tenantId = request.context.tenantId ?? "default-tenant";
      const packs = await packInstallerService.getPackStatus(tenantId);

      response.status(200).json({
        packs,
        requestId: request.context.requestId
      });
    })
  );

  router.post(
    "/:packId/version",
    asyncHandler(async (request, response) => {
      const tenantId = request.context.tenantId ?? "default-tenant";
      const payload = z
        .object({
          latestAvailableVersion: z.string().min(1)
        })
        .parse(request.body);
      const packId = requireStringValue(request.params.packId, "A valid pack id is required.");

      const result = await packInstallerService.updatePackVersion({
        latestAvailableVersion: payload.latestAvailableVersion,
        packId,
        tenantId
      });

      response.status(200).json({
        requestId: request.context.requestId,
        ...result
      });
    })
  );

  router.get(
    "/:packId",
    asyncHandler(async (request, response) => {
      const tenantId = request.context.tenantId ?? "default-tenant";
      const statuses = await packInstallerService.getPackStatus(tenantId);
      const packId = requireStringValue(request.params.packId, "A valid pack id is required.");
      const pack = statuses.find((item) => item.packId === packId);

      if (!pack) {
        throw new ProblemDetailsError({
          detail: `Pack ${packId} not found for tenant ${tenantId}.`,
          status: 404,
          title: "Pack Not Found"
        });
      }

      response.status(200).json({
        pack,
        requestId: request.context.requestId
      });
    })
  );

  return router;
}
