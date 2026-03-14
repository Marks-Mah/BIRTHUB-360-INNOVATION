import type { ApiConfig } from "@birthub/config";
import {
  apiKeyCreateRequestSchema,
  apiKeyCreateResponseSchema,
  apiKeyListResponseSchema
} from "@birthub/config";
import { Router } from "express";

import { requireAuthenticated } from "../../common/guards/index.js";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import { validateBody } from "../../middleware/validate-body.js";
import {
  createTenantApiKey,
  listTenantApiKeys,
  revokeTenantApiKey,
  rotateTenantApiKey
} from "../auth/auth.service.js";

function requireAuthScope(request: {
  context: { tenantId?: string | null; userId?: string | null };
}): { organizationId: string; userId: string } {
  const organizationId = request.context.tenantId;
  const userId = request.context.userId;

  if (!organizationId || !userId) {
    throw new ProblemDetailsError({
      detail: "A valid authenticated session is required.",
      status: 401,
      title: "Unauthorized"
    });
  }

  return {
    organizationId,
    userId
  };
}

function readApiKeyId(params: Record<string, string | string[] | undefined>): string {
  const value = params.id;

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (Array.isArray(value) && value[0]) {
    return value[0];
  }

  throw new ProblemDetailsError({
    detail: "A valid API key id is required.",
    status: 400,
    title: "Bad Request"
  });
}

export function createApiKeysRouter(config: ApiConfig): Router {
  const router = Router();

  router.use(requireAuthenticated);

  router.get(
    "/",
    asyncHandler(async (request, response) => {
      const scope = requireAuthScope(request);
      const items = await listTenantApiKeys(scope);

      response.status(200).json(
        apiKeyListResponseSchema.parse({
          items: items.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            scopes: item.scopes as Array<
              "agents:read" | "agents:write" | "webhooks:receive" | "workflows:trigger"
            >
          })),
          requestId: request.context.requestId
        })
      );
    })
  );

  router.post(
    "/",
    validateBody(apiKeyCreateRequestSchema),
    asyncHandler(async (request, response) => {
      const scope = requireAuthScope(request);
      const created = await createTenantApiKey({
        config,
        label: request.body.label,
        organizationId: scope.organizationId,
        scopes: request.body.scopes,
        userId: scope.userId
      });

      response.status(201).json(
        apiKeyCreateResponseSchema.parse({
          apiKey: created.key,
          id: created.id,
          requestId: request.context.requestId
        })
      );
    })
  );

  router.post(
    "/:id/rotate",
    asyncHandler(async (request, response) => {
      const scope = requireAuthScope(request);
      const id = readApiKeyId(request.params);
      const rotated = await rotateTenantApiKey({
        config,
        id,
        organizationId: scope.organizationId,
        userId: scope.userId
      });

      response.status(200).json(
        apiKeyCreateResponseSchema.parse({
          apiKey: rotated.key,
          id: rotated.id,
          requestId: request.context.requestId
        })
      );
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (request, response) => {
      const scope = requireAuthScope(request);
      const id = readApiKeyId(request.params);
      await revokeTenantApiKey({
        id,
        organizationId: scope.organizationId,
        userId: scope.userId
      });

      response.status(200).json({
        requestId: request.context.requestId,
        revoked: true
      });
    })
  );

  return router;
}
