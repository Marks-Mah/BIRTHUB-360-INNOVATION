import assert from "node:assert/strict";
import test from "node:test";

import { UserStatus, prisma } from "@birthub/database";
import request from "supertest";

import { createApp } from "../src/app.js";
import { createTestApiConfig } from "./test-config.js";
import { sha256 } from "../src/modules/auth/crypto.js";

function stubMethod(target: any, key: string, value: unknown): () => void {
  const original = target[key];
  target[key] = value;
  return () => {
    target[key] = original;
  };
}

void test("security sanitizes XSS payloads before queueing tasks", async () => {
  let queuedPayload: any = null;
  const restores = [
    stubMethod(prisma.session, "findUnique", async ({ where }: any) => {
      if (where.token !== sha256("atk_member")) {
        return null;
      }

      return {
        expiresAt: new Date(Date.now() + 60_000),
        id: "session_1",
        organizationId: "org_1",
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
    }))
  ];

  try {
    const app = createApp({
      config: createTestApiConfig(),
      enqueueTask: async (_config, payload) => {
        queuedPayload = payload;
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

    assert.equal(queuedPayload?.payload.description, "alert(1)");
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
