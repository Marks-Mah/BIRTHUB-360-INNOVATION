import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const configured = process.env.JWT_SECRET?.trim();

  if (configured) {
    return configured;
  }

  if (
    process.env.NODE_ENV === "development" &&
    process.env.LEGACY_ALLOW_INSECURE_DEV_AUTH === "true"
  ) {
    return "dev-secret-change-me";
  }

  throw new Error("LEGACY_JWT_SECRET_MISSING");
}

export type AuthenticatedRequest = Request & {
  auth?: {
    tenantId?: string;
    sub?: string;
    role?: string;
    orgId?: string;
    [key: string]: unknown;
  };
};

type AuthPayload = NonNullable<AuthenticatedRequest["auth"]>;

function getInternalServiceToken(): string {
  const configured = process.env.INTERNAL_SERVICE_TOKEN?.trim();

  if (configured) {
    return configured;
  }

  throw new Error("INTERNAL_SERVICE_TOKEN_MISSING");
}

export function requireJwt(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_bearer_token" });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const authPayload: AuthPayload =
      typeof payload === "object" && payload
        ? (payload as AuthPayload)
        : { sub: String(payload) };
    req.auth = authPayload;
    return next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

export function requireInternalServiceToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const received = req.header("x-service-token")?.trim();

  if (!received) {
    return res.status(401).json({ error: "missing_service_token" });
  }

  try {
    if (received !== getInternalServiceToken()) {
      return res.status(403).json({ error: "invalid_service_token" });
    }

    return next();
  } catch {
    return res.status(503).json({ error: "internal_service_token_not_configured" });
  }
}
