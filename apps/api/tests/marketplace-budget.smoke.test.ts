import assert from "node:assert/strict";
import test from "node:test";

import request from "supertest";

import { createApp } from "../src/app.js";
import { createTestApiConfig } from "./test-config.js";

const baseConfig = createTestApiConfig();

void test("marketplace search returns facets and ranked agents", async () => {
  const app = createApp({
    config: baseConfig,
    shouldExposeDocs: false
  });

  const response = await request(app)
    .get("/api/v1/agents/search?q=sales&page=1&pageSize=5")
    .expect(200);

  assert.ok(Array.isArray(response.body.results));
  assert.ok(typeof response.body.facets === "object");
  assert.ok(response.body.results.length >= 1);
  assert.ok(response.headers.etag);

  await request(app)
    .get("/api/v1/agents/search?q=sales&page=1&pageSize=5")
    .set("If-None-Match", response.headers.etag as string)
    .expect(304);
});

void test("budget endpoints configure and consume tenant budget", async () => {
  const app = createApp({
    config: baseConfig,
    shouldExposeDocs: false
  });

  await request(app)
    .post("/api/v1/budgets/limits")
    .set("x-tenant-id", "tenant-budget")
    .send({ agentId: "sales-pack", limit: 1 })
    .expect(200);

  await request(app)
    .post("/api/v1/budgets/consume")
    .set("x-tenant-id", "tenant-budget")
    .send({ agentId: "sales-pack", costBRL: 0.2, executionMode: "LIVE" })
    .expect(200);

  const usageResponse = await request(app)
    .get("/api/v1/budgets/usage")
    .set("x-tenant-id", "tenant-budget")
    .expect(200);

  assert.ok(Array.isArray(usageResponse.body.records));
  assert.ok(Array.isArray(usageResponse.body.usageEvents));
  assert.equal(usageResponse.body.records[0].tenantId, "tenant-budget");
});
