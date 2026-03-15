import { Router } from "express";
import jwt from "jsonwebtoken";
import {
  createAccessToken,
  createApiKey,
  createRefreshToken,
  rotateApiKey,
  rotateRefreshToken,
  revokeRefreshToken,
  type Principal,
} from "../security/auth-store.js";

export const authRouter = Router();
const legacyAuthBootstrapEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.LEGACY_ALLOW_DEV_PRINCIPAL_BOOTSTRAP === "true";

const resolvePrincipal = (body: Record<string, unknown>): Principal => ({
  sub: typeof body.sub === "string" ? body.sub : "user-dev",
  tenantId: typeof body.tenantId === "string" ? body.tenantId : "tenant-dev",
  roles: Array.isArray(body.roles) ? (body.roles as string[]) : ["member"],
  scopes: Array.isArray(body.scopes) ? (body.scopes as string[]) : ["api:read"],
  plan: body.plan === "enterprise" || body.plan === "growth" ? body.plan : "starter",
});

authRouter.use((req, res, next) => {
  if (legacyAuthBootstrapEnabled) {
    return next();
  }

  return res.status(410).json({
    error: {
      code: "LEGACY_AUTH_DISABLED",
      message:
        "Legacy api-gateway auth is frozen. Use apps/api for authenticated flows."
    }
  });
});

authRouter.post("/login", (req, res) => {
  const principal = resolvePrincipal(req.body ?? {});
  const accessToken = createAccessToken(principal);
  const refresh = createRefreshToken(principal);
  res.json({ accessToken, refreshToken: refresh.token, refreshJti: refresh.jti, tokenType: "Bearer", expiresIn: 900 });
});

authRouter.post("/refresh", (req, res) => {
  const refreshToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : "";
  if (!refreshToken) return res.status(400).json({ error: { code: "REFRESH_TOKEN_REQUIRED", message: "refreshToken is required" } });
  try {
    const next = rotateRefreshToken(refreshToken);
    return res.json({ accessToken: next.accessToken, refreshToken: next.refreshToken, refreshJti: next.refreshJti, tokenType: "Bearer", expiresIn: 900 });
  } catch {
    return res.status(401).json({ error: { code: "INVALID_REFRESH_TOKEN", message: "Refresh token is invalid or expired" } });
  }
});

authRouter.post("/logout", (req, res) => {
  const refreshToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : "";
  if (!refreshToken) return res.status(204).send();
  const decoded = jwt.decode(refreshToken) as jwt.JwtPayload | null;
  const jti = typeof decoded?.jti === "string" ? decoded.jti : "";
  if (jti) revokeRefreshToken(jti);
  return res.status(204).send();
});

authRouter.post("/api-keys", (req, res) => {
  const principal = resolvePrincipal(req.body ?? {});
  const created = createApiKey(principal);
  res.status(201).json(created);
});

authRouter.post("/api-keys/:id/rotate", (req, res) => {
  try {
    return res.status(201).json(rotateApiKey(req.params.id));
  } catch {
    return res.status(404).json({ error: { code: "API_KEY_NOT_FOUND", message: "API key not found" } });
  }
});
