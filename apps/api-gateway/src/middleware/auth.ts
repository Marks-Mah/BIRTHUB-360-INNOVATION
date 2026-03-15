import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { HttpError } from "../errors/http-error.js";
import { logger } from "../lib/logger.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

export interface AuthTokenPayload extends JwtPayload {
  sub?: string;
  email?: string;
  roles?: string[];
  scopes?: string[];
  tenantId?: string;
  organizationId?: string;
  plan?: string;
}

export interface AuthRequest extends Request {
  user?: AuthTokenPayload;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const serviceToken = req.headers["x-service-token"];
  const expectedServiceToken = process.env.INTERNAL_SERVICE_TOKEN;

  // Internal Service Authentication
  if (
    expectedServiceToken &&
    typeof serviceToken === "string" &&
    serviceToken === expectedServiceToken
  ) {
    req.user = {
      sub: "internal-service",
      roles: ["internal_service"],
      scopes: ["internal:*"],
      tenantId: (typeof req.headers["x-tenant-id"] === "string" ? req.headers["x-tenant-id"] : undefined) ?? "internal",
    };
    logger.info("Authenticated internal service request");
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    next(new HttpError(401, "UNAUTHORIZED", "No token provided"));
    return;
  }

  jwt.verify(token, JWT_SECRET, (error, decoded) => {
    if (error) {
      logger.warn(`JWT verification failed: ${error.message}`);
      next(new HttpError(403, "FORBIDDEN", "Invalid token"));
      return;
    }

    if (!decoded || typeof decoded === "string") {
      next(new HttpError(403, "FORBIDDEN", "Invalid token payload"));
      return;
    }

    req.user = decoded as AuthTokenPayload;
    // Session validation logic could be added here (e.g., checking Redis for revoked tokens)

    // RBAC Check (example: ensure user has at least one role)
    if (!req.user.roles || req.user.roles.length === 0) {
       logger.warn(`User ${req.user.sub} has no roles assigned`);
       // Depending on policy, might deny access or allow with restricted scope
    }

    next();
  });
};
