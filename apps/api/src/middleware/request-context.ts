import { randomUUID } from "node:crypto";

import { runWithLogContext } from "@birthub/logger";
import type { NextFunction, Request, Response } from "express";


declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

export interface RequestContext {
  apiKeyId: string | null;
  authType: "api-key" | "session" | null;
  billingPlanStatus:
    | {
        code?: string;
        hardLocked?: boolean;
        limits?: Record<string, unknown>;
        status?: string | null;
      }
    | null;
  requestId: string;
  sessionId: string | null;
  tenantId: string | null;
  tenantSlug: string | null;
  traceId: string;
  userId: string | null;
}

// ADR-007: tenant identity is bound at the edge and propagated immutably through the request lifecycle.
export function requestContextMiddleware(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  const requestId = request.header("x-request-id") ?? randomUUID();
  const traceId = request.header("x-trace-id") ?? requestId;
  const tenantId = request.header("x-tenant-id") ?? null;
  const tenantSlug = request.header("x-tenant-slug") ?? null;
  const userId = request.header("x-user-id") ?? null;

  request.context = {
    apiKeyId: null,
    authType: null,
    billingPlanStatus: null,
    requestId,
    sessionId: null,
    tenantId,
    tenantSlug,
    traceId,
    userId
  };

  response.setHeader("x-request-id", requestId);
  response.setHeader("x-trace-id", traceId);

  if (tenantId) {
    response.setHeader("x-tenant-id", tenantId);
  }

  if (tenantSlug) {
    response.setHeader("x-tenant-slug", tenantSlug);
  }

  if (userId) {
    response.setHeader("x-user-id", userId);
  }

  runWithLogContext(request.context, () => {
    next();
  });
}
