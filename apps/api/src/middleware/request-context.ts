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
  organizationId: string | null;
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

  request.context = {
    apiKeyId: null,
    authType: null,
    billingPlanStatus: null,
    organizationId: null,
    requestId,
    sessionId: null,
    tenantId: null,
    tenantSlug: null,
    traceId,
    userId: null
  };

  response.setHeader("x-request-id", requestId);
  response.setHeader("x-trace-id", traceId);

  runWithLogContext(request.context, () => {
    next();
  });
}
