import assert from "node:assert/strict";
import test from "node:test";
import { featureToggleMiddleware } from "../feature-toggle.js";

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

const tenantReq = {
  header(name: string) {
    if (name === "x-tenant-id") return "tenant-a";
    return undefined;
  },
} as const;

test("featureToggleMiddleware bloqueia rota experimental quando flag está desabilitada", async () => {
  delete process.env.FEATURE_LEAD_ENRICHMENT_ENABLED;
  const middleware = featureToggleMiddleware({
    featureName: "lead_enrichment",
    envVar: "FEATURE_LEAD_ENRICHMENT_ENABLED",
  });

  const res = createMockRes();
  let nextCalled = false;

  await middleware(tenantReq as never, res as never, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.state.statusCode, 404);
});

test("featureToggleMiddleware permite rota experimental quando flag está habilitada", async () => {
  process.env.FEATURE_LEAD_ENRICHMENT_ENABLED = "true";
  const middleware = featureToggleMiddleware({
    featureName: "lead_enrichment",
    envVar: "FEATURE_LEAD_ENRICHMENT_ENABLED",
  });

  const res = createMockRes();
  let nextCalled = false;

  await middleware(tenantReq as never, res as never, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.state.statusCode, undefined);

  delete process.env.FEATURE_LEAD_ENRICHMENT_ENABLED;
});
