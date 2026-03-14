import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const ACCESS_TTL_SECONDS = Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900);
const REFRESH_TTL_SECONDS = Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 60 * 60 * 24 * 30);

export type PlanType = "starter" | "growth" | "enterprise";

export interface Principal {
  sub: string;
  tenantId: string;
  roles: string[];
  scopes: string[];
  plan: PlanType;
}

interface RefreshSession {
  principal: Principal;
  expiresAt: number;
  revoked: boolean;
}

interface ApiKeyRecord {
  secretHash: string;
  principal: Principal;
  createdAt: number;
  revokedAt?: number;
}

const refreshSessions = new Map<string, RefreshSession>();
const apiKeys = new Map<string, ApiKeyRecord>();

const hashSecret = (raw: string) => crypto.createHash("sha256").update(raw).digest("hex");
const signToken = (principal: Principal, expiresIn: number, extraClaims?: Record<string, unknown>) => jwt.sign({
  sub: principal.sub,
  tenantId: principal.tenantId,
  roles: principal.roles,
  scopes: principal.scopes,
  plan: principal.plan,
  ...extraClaims,
}, JWT_SECRET, { expiresIn });

export function createAccessToken(principal: Principal): string {
  return signToken(principal, ACCESS_TTL_SECONDS);
}

export function createRefreshToken(principal: Principal): { token: string; jti: string; expiresAt: number } {
  const jti = crypto.randomUUID();
  const expiresAt = Date.now() + REFRESH_TTL_SECONDS * 1000;
  const token = signToken(principal, REFRESH_TTL_SECONDS, { type: "refresh", jti });
  refreshSessions.set(jti, { principal, expiresAt, revoked: false });
  return { token, jti, expiresAt };
}

export function rotateRefreshToken(refreshToken: string) {
  const decoded = jwt.verify(refreshToken, JWT_SECRET) as jwt.JwtPayload;
  const jti = typeof decoded.jti === "string" ? decoded.jti : "";
  const session = refreshSessions.get(jti);
  if (!session || session.revoked || session.expiresAt < Date.now()) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }
  session.revoked = true;
  const accessToken = createAccessToken(session.principal);
  const nextRefresh = createRefreshToken(session.principal);
  return { accessToken, refreshToken: nextRefresh.token, refreshJti: nextRefresh.jti, principal: session.principal };
}

export function revokeRefreshToken(jti: string): boolean {
  const session = refreshSessions.get(jti);
  if (!session) return false;
  session.revoked = true;
  return true;
}

export function createApiKey(principal: Principal) {
  const id = crypto.randomUUID();
  const secret = crypto.randomBytes(32).toString("hex");
  apiKeys.set(id, {
    principal,
    secretHash: hashSecret(secret),
    createdAt: Date.now(),
  });
  return { id, apiKey: `${id}.${secret}` };
}

export function rotateApiKey(keyId: string) {
  const current = apiKeys.get(keyId);
  if (!current) throw new Error("API_KEY_NOT_FOUND");
  current.revokedAt = Date.now();
  return createApiKey(current.principal);
}

export function authenticateApiKey(rawApiKey: string): Principal | null {
  const [id, secret] = rawApiKey.split(".");
  if (!id || !secret) return null;
  const key = apiKeys.get(id);
  if (!key || key.revokedAt) return null;
  return key.secretHash === hashSecret(secret) ? key.principal : null;
}
