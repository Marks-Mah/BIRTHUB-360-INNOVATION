import type { NextFunction, Response } from "express";
import type { AuthRequest } from "./auth.js";

type RbacRole = "admin" | "manager" | "sales" | "viewer" | "sales_manager" | "finance_manager";

const VALID_ROLES: RbacRole[] = ["admin", "manager", "sales", "viewer", "sales_manager", "finance_manager"];

export function requireAuthorization(options: { scopes?: string[]; roles?: RbacRole[] }) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user ?? {};
    const userScopes: string[] = Array.isArray(user.scopes) ? user.scopes : [];
    const userRoles = (Array.isArray(user.roles) ? user.roles : []).filter((role: string): role is RbacRole => VALID_ROLES.includes(role as RbacRole));

    if (options.scopes?.length) {
      const missing = options.scopes.filter((scope) => !userScopes.includes(scope));
      if (missing.length > 0) {
        return res.status(403).json({ error: { code: "AUTH_SCOPE_MISSING", message: "Insufficient scope", details: { missingScopes: missing } } });
      }
    }

    if (options.roles?.length) {
      const hasRole = options.roles.some((role) => userRoles.includes(role));
      if (!hasRole) {
        return res.status(403).json({ error: { code: "AUTH_ROLE_MISSING", message: "Insufficient role", details: { requiredRoles: options.roles } } });
      }
    }

    return next();
  };
}
