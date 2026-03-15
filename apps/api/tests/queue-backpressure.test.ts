import assert from "node:assert/strict";
import test from "node:test";

import { UserStatus, prisma } from "@birthub/database";
import request from "supertest";

import { createApp } from "../src/app.js";
import { QueueBackpressureError } from "../src/lib/queue.js";
import { sha256 } from "../src/modules/auth/crypto.js";
import { budgetService } from "../src/modules/budget/budget.service.js";
import { createTestApiConfig } from "./test-config.js";

function stubMethod(target: object, key: string, value: unknown): () => void {
  const original = Reflect.get(target, key);
  Reflect.set(target, key, value);
  return () => {
    Reflect.set(target, key, original);
  };
}

void test("tasks endpoint returns 503 when queue backpressure threshold is reached", async () => {
  const restores = [
    stubMethod(prisma.session, "findUnique", async (args: { where?: { token?: string } }) => {
      if (args.where?.token !== sha256("atk_member")) {
        return null;
      }

      return {
        expiresAt: new Date(Date.now() + 60_000),
        id: "session_1",
        organizationId: "org_1",
        tenantId: "tenant_1",
        revokedAt: null,
        userId: "user_1"
      };
    }),
    stubMethod(prisma.session, "update", async () => ({ id: "session_1" })),
    stubMethod(prisma.user, "findUnique", async () => ({
      id: "user_1",
      status: UserStatus.ACTIVE
    })),
    stubMethod(budgetService, "consumeBudget", async () => ({
      agentId: "ceo-pack",
      consumed: 0.5,
      currency: "BRL",
      id: "budget_1",
      limit: 100,
      tenantId: "tenant_1",
      updatedAt: new Date().toISOString()
    }))
  ];

  try {
  const app = createApp({
    config: createTestApiConfig(),
    enqueueTask: async () => {
      throw new QueueBackpressureError(10_000, 10_000);
    },
    shouldExposeDocs: false
  });

    const response = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", "Bearer atk_member")
      .set("x-csrf-token", "csrf_1")
      .set("Cookie", ["bh360_csrf=csrf_1"])
      .send({
        agentId: "ceo-pack",
        approvalRequired: false,
        estimatedCostBRL: 0.5,
        executionMode: "LIVE",
        payload: { sample: true },
        type: "sync-session"
      });

    assert.equal(response.status, 503);
    assert.equal(response.body.title, "Service Unavailable");
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});
