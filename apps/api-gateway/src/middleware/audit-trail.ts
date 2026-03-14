import type { NextFunction, Response } from "express";
import type { AuthRequest } from "./auth.js";
import { resolveTenantId } from "./tenant-context.js";

export function auditTrailMiddleware(action: string) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    const actor = req.user?.sub ?? "anonymous";
    const tenantId = resolveTenantId(req);

    console.info(
      JSON.stringify({
        event: "admin_audit_trail",
        action,
        actor,
        tenantId,
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString(),
        traceId: req.headers["x-trace-id"] ?? null,
      }),
    );

    return next();
  };
}
