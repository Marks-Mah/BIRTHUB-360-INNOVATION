import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errors/http-error.js";
import type { AuthRequest } from "./auth.js";

export type TenantContext = {
  tenantId: string;
  source: "token" | "header";
};

export type TenantBoundRequest = Request & {
  tenantContext?: TenantContext;
};

const resolveTenantFromRequest = (req: Request): TenantContext => {
  const authReq = req as AuthRequest;
  const claimTenantId = authReq.user?.tenantId ?? authReq.user?.organizationId;

  if (claimTenantId && claimTenantId.trim().length > 0) {
    return { tenantId: claimTenantId.trim(), source: "token" };
  }

  const tenantHeader =
    typeof req.header === "function"
      ? req.header("x-tenant-id")?.trim()
      : typeof req.headers?.["x-tenant-id"] === "string"
        ? req.headers["x-tenant-id"].trim()
        : undefined;

  if (tenantHeader && tenantHeader.length > 0) {
    return { tenantId: tenantHeader, source: "header" };
  }

  throw new HttpError(400, "TENANT_CONTEXT_REQUIRED", "Missing tenant context");
};

export const resolveTenantContext = (req: Request): TenantContext => {
  const boundRequest = req as TenantBoundRequest;
  if (boundRequest.tenantContext) {
    return boundRequest.tenantContext;
  }

  return resolveTenantFromRequest(req);
};

export const resolveTenantId = (req: Request): string => resolveTenantContext(req).tenantId;

export const tenantContextMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const tenantContext = resolveTenantFromRequest(req);
  const boundRequest = req as TenantBoundRequest;

  Object.defineProperty(boundRequest, "tenantContext", {
    value: Object.freeze(tenantContext),
    writable: false,
    configurable: false,
    enumerable: false,
  });

  next();
};
