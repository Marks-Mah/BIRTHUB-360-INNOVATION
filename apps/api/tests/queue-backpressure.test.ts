import assert from "node:assert/strict";
import test from "node:test";

import request from "supertest";

import { createApp } from "../src/app.js";
import { QueueBackpressureError } from "../src/lib/queue.js";
import { createTestApiConfig } from "./test-config.js";

void test("tasks endpoint returns 503 when queue backpressure threshold is reached", async () => {
  const app = createApp({
    config: createTestApiConfig(),
    enqueueTask: async () => {
      throw new QueueBackpressureError(10_000, 10_000);
    },
    shouldExposeDocs: false
  });

  const response = await request(app).post("/api/v1/tasks").send({
    agentId: "ceo-pack",
    approvalRequired: false,
    estimatedCostBRL: 0.5,
    executionMode: "LIVE",
    payload: { sample: true },
    type: "sync-session"
  });

  assert.equal(response.status, 503);
  assert.equal(response.body.title, "Service Unavailable");
});
