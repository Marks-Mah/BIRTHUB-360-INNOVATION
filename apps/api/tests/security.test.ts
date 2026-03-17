import assert from "node:assert/strict";
import test from "node:test";

import { UserStatus, prisma } from "@birthub/database";
import request from "supertest";

import { createApp } from "../src/app.js";
import { createTestApiConfig } from "./test-config.js";
import { sha256 } from "../src/modules/auth/crypto.js";
import { budgetService } from "../src/modules/budget/budget.service.js";

function stubMethod(target: object, key: string, value: unknown): () => void {
  const original = Reflect.get(target, key);
  Reflect.set(target, key, value);
  return () => {
    Reflect.set(target, key, original);
  };
}

void test("security sanitizes XSS payloads before queueing tasks", async () => {
  let queuedDescription: string | null = null;
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
    stubMethod(prisma.jobSigningSecret, "findUnique", async () => ({
      organizationId: "org_1",
      secret: "tenant-secret"
    })),
    stubMethod(budgetService, "consumeBudget", async () => ({
      agentId: "ceo-pack",
      consumed: 0,
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
      enqueueTask: async (_config, payload) => {
        if (
          payload &&
          typeof payload === "object" &&
          "payload" in payload &&
          payload.payload &&
          typeof payload.payload === "object" &&
          "description" in payload.payload &&
          typeof payload.payload.description === "string"
        ) {
          queuedDescription = payload.payload.description;
        }
        return { jobId: "job_1" };
      },
      shouldExposeDocs: false
    });

    await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", "Bearer atk_member")
      .set("x-csrf-token", "csrf_1")
      .set("Cookie", ["bh360_csrf=csrf_1"])
      .send({
        payload: {
          description: "<script>alert(1)</script>"
        },
        type: "send-welcome-email"
      })
      .expect(202);

    assert.equal(queuedDescription, "alert(1)");
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});

void test("security rejects malicious Origin headers on mutation endpoints", async () => {
  const app = createApp({
    config: createTestApiConfig(),
    shouldExposeDocs: false
  });

  await request(app)
    .post("/api/v1/auth/login")
    .set("Origin", "https://evil.example")
    .send({
      email: "owner@birthub.local",
      password: "password123",
      tenantId: "birthhub-alpha"
    })
    .expect(403);
});

void test("security requires an authenticated session for connector OAuth callbacks", async () => {
  const app = createApp({
    config: createTestApiConfig(),
    shouldExposeDocs: false
  });

  await request(app)
    .post("/api/v1/connectors/hubspot/callback")
    .send({
      state: Buffer.from(
        JSON.stringify({
          accountKey: "primary",
          organizationId: "org_1",
          provider: "hubspot",
          requestId: "req_1",
          tenantId: "tenant_1",
          userId: "user_1",
          version: 1
        })
      ).toString("base64url")
    })
    .expect(401);

  await request(app)
    .get("/api/v1/connectors/hubspot/callback")
    .query({
      state: Buffer.from(
        JSON.stringify({
          accountKey: "primary",
          organizationId: "org_1",
          provider: "hubspot",
          requestId: "req_2",
          tenantId: "tenant_1",
          userId: "user_1",
          version: 1
        })
      ).toString("base64url")
    })
    .expect(401);
});
