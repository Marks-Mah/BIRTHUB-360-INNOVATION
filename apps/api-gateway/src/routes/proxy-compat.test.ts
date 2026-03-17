import assert from "node:assert/strict";
import test from "node:test";

import { resolveGatewayProxyPath } from "../proxy/path-map.js";
import { resolveProxyRequestBody } from "../proxy/service-proxy.js";

void test("gateway rewrites legacy Stripe webhook path to the canonical API path", () => {
  assert.equal(resolveGatewayProxyPath("/webhooks/stripe"), "/api/webhooks/stripe");
  assert.equal(
    resolveGatewayProxyPath("/webhooks/stripe?source=stripe"),
    "/api/webhooks/stripe?source=stripe"
  );
  assert.equal(resolveGatewayProxyPath("/api/webhooks/stripe"), "/api/webhooks/stripe");
});

void test("proxy preserves raw webhook request bodies", () => {
  const payload = Buffer.from('{"id":"evt_test"}');

  assert.equal(resolveProxyRequestBody("POST", payload), payload);
  assert.equal(
    resolveProxyRequestBody("POST", { id: "evt_test" }),
    JSON.stringify({ id: "evt_test" })
  );
  assert.equal(resolveProxyRequestBody("GET", payload), null);
});
