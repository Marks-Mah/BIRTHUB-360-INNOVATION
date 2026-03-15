import type { NextFunction, Request, RequestHandler, Response } from "express";

import { Role } from "@birthub/database";

import { ProblemDetailsError } from "../../lib/problem-details.js";
import { assertRole } from "../../modules/auth/auth.service.js";

/** @see ADR-011 */
export function RequireRole(minimumRole: Role): RequestHandler {
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      const userId = request.context.userId;
      const organizationId = request.context.organizationId;

      if (!userId || !organizationId) {
        throw new ProblemDetailsError({
          detail: "Authentication is required before role authorization.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const hasRole = await assertRole({
        minimumRole,
        organizationId,
        userId
      });

      if (!hasRole) {
        throw new ProblemDetailsError({
          detail: `Role '${minimumRole}' is required for this operation.`,
          status: 403,
          title: "Forbidden"
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAuthenticated(request: Request, _response: Response, next: NextFunction): void {
  if (
    !request.context.userId ||
    !request.context.organizationId ||
    !request.context.tenantId
  ) {
    next(
      new ProblemDetailsError({
        detail: "A valid session or API key is required.",
        status: 401,
        title: "Unauthorized"
      })
    );
    return;
  }

  next();
}

export function requireAuthenticatedSession(
  request: Request,
  _response: Response,
  next: NextFunction
): void {
  if (
    request.context.authType !== "session" ||
    !request.context.userId ||
    !request.context.organizationId ||
    !request.context.tenantId ||
    !request.context.sessionId
  ) {
    next(
      new ProblemDetailsError({
        detail: "A valid authenticated session is required.",
        status: 401,
        title: "Unauthorized"
      })
    );
    return;
  }

  next();
}
