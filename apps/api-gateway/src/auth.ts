import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export type AuthenticatedRequest = Request & {
  auth?: {
    sub?: string;
    role?: string;
    orgId?: string;
    [key: string]: unknown;
  };
};

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
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth =
      typeof payload === "object"
        ? (payload as AuthenticatedRequest["auth"])
        : { sub: String(payload) };
    return next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}
