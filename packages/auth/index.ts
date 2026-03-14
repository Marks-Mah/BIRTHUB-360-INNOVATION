import { jwtVerify, SignJWT } from "jose";

export type AuthUser = { id: string; tenantId: string; roles: string[]; permissions: string[]; email?: string | undefined };
export type JWTPayload = AuthUser & { type: "access" | "refresh"; jti: string };
export type TokenPair = { accessToken: string; refreshToken: string };
export type AuthConfig = { jwtSecret: string; accessTtlSec: number; refreshTtlSec: number };

export type AuthService = {
  issueTokens(user: AuthUser): Promise<TokenPair>;
  verifyAccessToken(token: string): Promise<JWTPayload>;
  rotateRefreshToken(refreshToken: string): Promise<TokenPair>;
  requireRole(role: string): (user: AuthUser) => void;
  requirePermission(permission: string): (user: AuthUser) => void;
};

function secret(config: AuthConfig): Uint8Array {
  return new TextEncoder().encode(config.jwtSecret);
}

export function createAuthService(config: AuthConfig): AuthService {
  const refreshStore = new Map<string, JWTPayload>();

  async function sign(payload: JWTPayload, ttlSec: number): Promise<string> {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${ttlSec}s`)
      .setJti(payload.jti)
      .sign(secret(config));
  }

  return {
    async issueTokens(user) {
      const base = { ...user };
      const refreshPayload: JWTPayload = { ...base, type: "refresh", jti: crypto.randomUUID() };
      const accessPayload: JWTPayload = { ...base, type: "access", jti: crypto.randomUUID() };
      const refreshToken = await sign(refreshPayload, config.refreshTtlSec);
      refreshStore.set(refreshPayload.jti, refreshPayload);
      return { accessToken: await sign(accessPayload, config.accessTtlSec), refreshToken };
    },
    async verifyAccessToken(token) {
      const { payload } = await jwtVerify(token, secret(config));
      if (payload.type !== "access") throw new Error("invalid_token_type");
      return payload as unknown as JWTPayload;
    },
    async rotateRefreshToken(refreshToken) {
      const { payload } = await jwtVerify(refreshToken, secret(config));
      const refreshPayload = payload as unknown as JWTPayload;
      if (refreshPayload.type !== "refresh") throw new Error("invalid_token_type");
      if (!refreshStore.has(refreshPayload.jti)) throw new Error("refresh_revoked");
      refreshStore.delete(refreshPayload.jti);
      const user: AuthUser = {
        id: refreshPayload.id,
        tenantId: refreshPayload.tenantId,
        roles: refreshPayload.roles,
        permissions: refreshPayload.permissions,
        ...(refreshPayload.email !== undefined ? { email: refreshPayload.email } : {}),
      };
      return this.issueTokens(user);
    },
    requireRole(role: string) {
      return (user: AuthUser) => {
        if (!user.roles.includes(role)) throw new Error("forbidden_role");
      };
    },
    requirePermission(permission: string) {
      return (user: AuthUser) => {
        if (!user.permissions.includes(permission)) throw new Error("forbidden_permission");
      };
    },
  };
}
