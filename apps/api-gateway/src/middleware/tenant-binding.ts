import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errors/http-error.js";
import type { AuthRequest } from "./auth.js";

const normalizeTenant = (value?: string): string | undefined => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
};

export const enforceTenantBinding = (req: Request, _res: Response, next: NextFunction): void => {
  const authReq = req as AuthRequest;
  const claimTenant = normalizeTenant(authReq.user?.tenantId ?? authReq.user?.organizationId);
  const headerTenant = normalizeTenant(
    typeof req.header === "function"
      ? req.header("x-tenant-id") ?? undefined
      : (typeof req.headers?.["x-tenant-id"] === "string" ? req.headers["x-tenant-id"] : undefined),
  );

  if (claimTenant && headerTenant && claimTenant !== headerTenant) {
    throw new HttpError(403, "TENANT_CONTEXT_MISMATCH", "Tenant header does not match token tenant", {
      tokenTenantId: claimTenant,
      headerTenantId: headerTenant,
    });
  }

  next();
};
