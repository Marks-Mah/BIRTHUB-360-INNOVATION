import assert from "node:assert/strict";
import test from "node:test";
import { openApiDocument } from "./openapi.js";

test("OpenAPI expõe endpoints críticos", () => {
  const paths = openApiDocument.paths as Record<string, Record<string, unknown>>;
  const critical = [
    "/api/v1/leads",
    "/api/v1/deals/{id}/stage",
    "/api/v1/customers/{id}/health",
    "/api/v1/analytics/funnel",
    "/webhooks/stripe",
  ];

  for (const path of critical) {
    assert.ok(paths[path], `Missing path ${path}`);
  }
});

test("OpenAPI aplica segurança bearer fora de webhooks", () => {
  const leadGet = (openApiDocument.paths as any)["/api/v1/leads"].get;
  const stripeWebhook = (openApiDocument.paths as any)["/webhooks/stripe"].post;

  assert.ok(Array.isArray(leadGet.security) && leadGet.security.length > 0);
  assert.deepEqual(stripeWebhook.security, []);
});
