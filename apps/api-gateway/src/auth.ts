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
    sub?: string;
    role?: string;
    orgId?: string;
    [key: string]: unknown;
  };
};

type AuthPayload = NonNullable<AuthenticatedRequest["auth"]>;

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
