import assert from "node:assert/strict";
import test from "node:test";
import { createTenantRateLimitMiddleware } from "../tenant-rate-limit.js";

function createMockRes() {
  const state: { statusCode?: number; payload?: unknown } = {};
  return {
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      state.payload = payload;
      return this;
    },
    state,
  };
}

test("tenantRateLimit bloqueia após exceder limite", () => {
  const middleware = createTenantRateLimitMiddleware({ max: 1, windowMs: 60_000 });
  const req = {
    method: "GET",
    path: "/api/leads",
    route: { path: "/api/leads" },
    header(name: string) {
      if (name === "x-tenant-id") return "tenant-a";
      return undefined;
    },
  };

  middleware(req as any, createMockRes() as any, () => undefined);
  const res2 = createMockRes();
  middleware(req as any, res2 as any, () => undefined);

  assert.equal(res2.state.statusCode, 429);
});
