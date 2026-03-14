import type { NextFunction, Request, Response } from "express";
import { resolveTenantContext } from "./tenant-context.js";

export const tenantObservabilityMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const tenantContext = resolveTenantContext(req);
  res.locals.tenantContext = tenantContext;
  res.setHeader("x-tenant-id", tenantContext.tenantId);
  res.setHeader("x-tenant-source", tenantContext.source);
  next();
};
