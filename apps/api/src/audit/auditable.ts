import type { NextFunction, Request, Response } from "express";

import { enqueueAuditEvent } from "./buffer.js";
import { ProblemDetailsError } from "../lib/problem-details.js";
import { readTrimmedString } from "../lib/request-values.js";

type AuditableOptions<TResult> = {
  action: string;
  entityType: string;
  requireActor?: boolean;
  resolveEntityId?: (
    request: Request,
    response: Response,
    result: TResult | void
  ) => string | string[] | undefined;
  resolveTenantId?: (
    request: Request,
    response: Response,
    result: TResult | void
  ) => string | string[] | undefined;
};

type AsyncRouteHandler<TResult> = (
  request: Request,
  response: Response,
  next: NextFunction
) => Promise<TResult | void>;

export function Auditable<TResult>(options: AuditableOptions<TResult>) {
  return (handler: AsyncRouteHandler<TResult>): AsyncRouteHandler<TResult> =>
    async (request, response, next) => {
      const result = await handler(request, response, next);

      if (!["DELETE", "PATCH", "POST", "PUT"].includes(request.method)) {
        return result;
      }

      const tenantId = readTrimmedString(
        options.resolveTenantId?.(request, response, result) ?? request.context.tenantId
      );

      if (!tenantId) {
        return result;
      }

      const actorId = request.context.userId;

      if (options.requireActor && !actorId) {
        throw new ProblemDetailsError({
          detail: "An authenticated actor is required for this mutation.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const entityId =
        readTrimmedString(
          options.resolveEntityId?.(request, response, result) ??
            request.params.id ??
            request.params.memberId
        ) ?? "unknown";

      enqueueAuditEvent({
        action: options.action,
        actorId: actorId ?? null,
        diff: {
          payload: request.body ?? null,
          response: result ?? null
        },
        entityId,
        entityType: options.entityType,
        ip: request.ip || null,
        tenantId,
        userAgent: request.get("user-agent") ?? null
      });

      return result;
    };
}
