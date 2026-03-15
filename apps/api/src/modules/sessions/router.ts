import type { ApiConfig } from "@birthub/config";
import { logoutResponseSchema } from "@birthub/config";
import { Router } from "express";

import { requireAuthenticatedSession } from "../../common/guards/index.js";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import {
  revokeAllSessions,
  revokeSessionById
} from "../auth/auth.service.js";
import { clearAuthCookies } from "../auth/cookies.js";

function readSessionId(params: Record<string, string | string[] | undefined>): string {
  const value = params.sessionId;

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (Array.isArray(value) && value[0]) {
    return value[0];
  }

  throw new ProblemDetailsError({
    detail: "A valid session id is required.",
    status: 400,
    title: "Bad Request"
  });
}

export function createSessionsRouter(config: ApiConfig): Router {
  const router = Router();

  router.delete(
    "/sessions/:sessionId",
    requireAuthenticatedSession,
    asyncHandler(async (request, response) => {
      const organizationId = request.context.organizationId;
      const userId = request.context.userId;

      if (!organizationId || !userId) {
        throw new ProblemDetailsError({
          detail: "A valid authenticated session is required.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const sessionId = readSessionId(request.params);
      const revokedSessions = await revokeSessionById({
        organizationId,
        sessionId,
        userId
      });

      if (request.context.sessionId === sessionId && revokedSessions > 0) {
        clearAuthCookies(response, config);
      }

      response.status(200).json(
        logoutResponseSchema.parse({
          requestId: request.context.requestId,
          revokedSessions
        })
      );
    })
  );

  const logoutAllHandler = asyncHandler(async (request, response) => {
    const organizationId = request.context.organizationId;
    const userId = request.context.userId;

    if (!organizationId || !userId) {
      throw new ProblemDetailsError({
        detail: "A valid authenticated session is required.",
        status: 401,
        title: "Unauthorized"
      });
    }

    const revokedSessions = await revokeAllSessions({
      organizationId,
      userId
    });

    clearAuthCookies(response, config);
    response.status(200).json(
      logoutResponseSchema.parse({
        requestId: request.context.requestId,
        revokedSessions
      })
    );
  });

  router.post("/sessions/logout-all", requireAuthenticatedSession, logoutAllHandler);
  router.post("/auth/logout-all", requireAuthenticatedSession, logoutAllHandler);

  return router;
}
