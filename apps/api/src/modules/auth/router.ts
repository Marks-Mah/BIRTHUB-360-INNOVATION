import type { ApiConfig } from "@birthub/config";
import { authIntrospectionResponseSchema } from "@birthub/config";
import { prisma } from "@birthub/database";
import { Router } from "express";
import { z } from "zod";

import { requireAuthenticated } from "../../common/guards/index.js";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import { validateBody } from "../../middleware/validate-body.js";
import {
  enableMfaForUser,
  introspectApiKey,
  setupMfaForUser
} from "./auth.service.js";

const enableMfaRequestSchema = z
  .object({
    totpCode: z.string().regex(/^\d{6}$/)
  })
  .strict();

function extractApiKeyToken(request: {
  header(name: string): string | undefined;
}): string | null {
  const explicitToken = request.header("x-api-key")?.trim();

  if (explicitToken) {
    return explicitToken;
  }

  const authorization = request.header("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, credential] = authorization.split(" ");

  if (!scheme || !credential) {
    return null;
  }

  const normalizedScheme = scheme.toLowerCase();
  if (normalizedScheme !== "apikey" && normalizedScheme !== "bearer") {
    return null;
  }

  return credential;
}

export function createAuthRouter(config: ApiConfig): Router {
  const router = Router();

  router.get(
    "/introspect",
    asyncHandler(async (request, response) => {
      const token = extractApiKeyToken(request);

      if (!token) {
        response.status(200).json(
          authIntrospectionResponseSchema.parse({
            active: false,
            requestId: request.context.requestId,
            scopes: [],
            tenantId: null,
            userId: null
          })
        );
        return;
      }

      const introspection = await introspectApiKey(token);

      response.status(200).json(
        authIntrospectionResponseSchema.parse({
          ...introspection,
          requestId: request.context.requestId
        })
      );
    })
  );

  router.post(
    "/mfa/setup",
    requireAuthenticated,
    asyncHandler(async (request, response) => {
      const userId = request.context.userId;

      if (!userId) {
        throw new ProblemDetailsError({
          detail: "Authenticated user context is required.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const user = await prisma.user.findUnique({
        where: {
          id: userId
        }
      });

      if (!user) {
        throw new ProblemDetailsError({
          detail: "User not found for MFA setup.",
          status: 404,
          title: "Not Found"
        });
      }

      response.status(200).json(
        await setupMfaForUser({
          config,
          email: user.email,
          userId
        })
      );
    })
  );

  router.post(
    "/mfa/enable",
    requireAuthenticated,
    validateBody(enableMfaRequestSchema),
    asyncHandler(async (request, response) => {
      const userId = request.context.userId;

      if (!userId) {
        throw new ProblemDetailsError({
          detail: "Authenticated user context is required.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const enabled = await enableMfaForUser({
        config,
        totpCode: request.body.totpCode,
        userId
      });

      if (!enabled) {
        throw new ProblemDetailsError({
          detail: "The provided TOTP code is invalid.",
          status: 400,
          title: "Bad Request"
        });
      }

      response.status(200).json({
        enabled: true,
        requestId: request.context.requestId
      });
    })
  );

  return router;
}
