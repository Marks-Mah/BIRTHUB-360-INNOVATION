import assert from "node:assert/strict";
import test from "node:test";

import request from "supertest";

import { createApp } from "../src/app.js";
import { createTestApiConfig } from "./test-config.js";

void test("health endpoint returns 200 with database, redis and external status", async () => {
  const config = createTestApiConfig();

  const app = createApp({
    config,
    healthService: async () => ({
      checkedAt: new Date("2026-03-13T00:00:00.000Z").toISOString(),
      services: {
        database: {
          status: "up" as const
        },
        externalDependencies: [
          {
            name: "example.com",
            status: "up" as const
          }
        ],
        redis: {
          status: "up" as const
        }
      },
      status: "ok" as const
    }),
    shouldExposeDocs: false
  });

  const response = await request(app).get("/api/v1/health").expect(200);

  assert.equal(response.body.status, "ok");
  assert.equal(response.body.services.database.status, "up");
  assert.equal(response.body.services.redis.status, "up");
  assert.equal(response.body.services.externalDependencies[0].status, "up");
});

void test("health alias returns 200 for container probes", async () => {
  const config = createTestApiConfig();

  const app = createApp({
    config,
    healthService: async () => ({
      checkedAt: new Date("2026-03-13T00:00:00.000Z").toISOString(),
      services: {
        database: {
          status: "up" as const
        },
        externalDependencies: [],
        redis: {
          status: "up" as const
        }
      },
      status: "ok" as const
    }),
    shouldExposeDocs: false
  });

  const response = await request(app).get("/health").expect(200);
  assert.equal(response.body.status, "ok");
});
