import test from "node:test";
import assert from "node:assert/strict";
import { createAuthService } from "../../index.js";

const svc = createAuthService({ jwtSecret: "secret", accessTtlSec: 60, refreshTtlSec: 120 });
const user = { id: "u1", tenantId: "t1", roles: ["ADMIN"], permissions: ["agent:execute"], email: "a@b.com" };

test("issue and verify access token", async () => {
  const pair = await svc.issueTokens(user);
  const payload = await svc.verifyAccessToken(pair.accessToken);
  assert.equal(payload.id, "u1");
});

test("refresh rotation works", async () => {
  const pair = await svc.issueTokens(user);
  const rotated = await svc.rotateRefreshToken(pair.refreshToken);
  assert.ok(rotated.accessToken.length > 20);
});

test("old refresh gets revoked", async () => {
  const pair = await svc.issueTokens(user);
  await svc.rotateRefreshToken(pair.refreshToken);
  await assert.rejects(() => svc.rotateRefreshToken(pair.refreshToken));
});

test("requireRole allows proper role", () => {
  assert.doesNotThrow(() => svc.requireRole("ADMIN")(user));
});

test("requirePermission blocks missing", () => {
  assert.throws(() => svc.requirePermission("billing:read")(user));
});
