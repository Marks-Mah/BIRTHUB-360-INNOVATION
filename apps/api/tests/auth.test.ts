import assert from "node:assert/strict";
import test from "node:test";

import { prisma, UserStatus } from "@birthub/database";
import request from "supertest";

import { createApp } from "../src/app.js";
import { encryptTotpSecret, generateCurrentTotp, generateTotpSecret } from "../src/modules/auth/mfa.service.js";
import { sha256 } from "../src/modules/auth/crypto.js";
import { createTestApiConfig } from "./test-config.js";

function stubMethod(target: object, key: string, value: unknown): () => void {
  const original = Reflect.get(target, key);
  Reflect.set(target, key, value);
  return () => {
    Reflect.set(target, key, original);
  };
}

function createAuthTestApp() {
  return createApp({
    config: createTestApiConfig(),
    healthService: async () => ({
      checkedAt: new Date("2026-03-13T00:00:00.000Z").toISOString(),
      services: {
        database: { status: "up" as const },
        externalDependencies: [],
        redis: { status: "up" as const }
      },
      status: "ok" as const
    }),
    shouldExposeDocs: false
  });
}

void test("auth login returns 200 and creates a session", async () => {
  const restores = [
    stubMethod(prisma.organization, "findFirst", async () => ({ id: "org_1", tenantId: "tenant_1" })),
    stubMethod(prisma.membership, "findFirst", async () => ({
      organizationId: "org_1",
      role: "OWNER",
      tenantId: "tenant_1",
      user: {
        email: "owner@birthub.local",
        id: "user_1",
        mfaEnabled: false,
        passwordHash: sha256("password123"),
        status: UserStatus.ACTIVE
      },
      userId: "user_1"
    })),
    stubMethod(prisma.user, "update", async () => ({ id: "user_1" })),
    stubMethod(prisma.session, "findFirst", async () => null),
    stubMethod(prisma.session, "create", async () => ({
      id: "session_1"
    }))
  ];

  try {
    const app = createAuthTestApp();
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "owner@birthub.local",
        password: "password123",
        tenantId: "birthhub-alpha"
      })
      .expect(200);

    assert.equal(response.body.mfaRequired, false);
    assert.equal(response.body.session.userId, "user_1");
    assert.equal(response.body.session.tenantId, "tenant_1");
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});

void test("auth login with MFA enabled returns challenge token", async () => {
  const restores = [
    stubMethod(prisma.organization, "findFirst", async () => ({ id: "org_1", tenantId: "tenant_1" })),
    stubMethod(prisma.membership, "findFirst", async () => ({
      organizationId: "org_1",
      role: "OWNER",
      tenantId: "tenant_1",
      user: {
        email: "owner@birthub.local",
        id: "user_1",
        mfaEnabled: true,
        passwordHash: sha256("password123"),
        status: UserStatus.ACTIVE
      },
      userId: "user_1"
    })),
    stubMethod(prisma.user, "update", async () => ({ id: "user_1" })),
    stubMethod(prisma.session, "findFirst", async () => null),
    stubMethod(prisma.mfaChallenge, "create", async () => ({ id: "challenge_1" }))
  ];

  try {
    const app = createAuthTestApp();
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "owner@birthub.local",
        password: "password123",
        tenantId: "birthhub-alpha"
      })
      .expect(200);

    assert.equal(response.body.mfaRequired, true);
    assert.equal(typeof response.body.challengeToken, "string");
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});

void test("auth MFA challenge verification accepts valid TOTP", async () => {
  const config = createTestApiConfig();
  const secret = generateTotpSecret();
  const encrypted = encryptTotpSecret(secret, config.AUTH_MFA_ENCRYPTION_KEY);
  const validTotp = generateCurrentTotp(secret);

  const restores = [
    stubMethod(prisma.mfaChallenge, "findUnique", async () => ({
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      id: "challenge_1",
      organizationId: "org_1",
      tenantId: "tenant_1",
      userId: "user_1"
    })),
    stubMethod(prisma.user, "findUnique", async () => ({
      id: "user_1",
      mfaSecret: encrypted
    })),
    stubMethod(prisma.mfaChallenge, "update", async () => ({ id: "challenge_1" })),
    stubMethod(prisma.session, "create", async () => ({ id: "session_2" }))
  ];

  try {
    const app = createApp({
      config,
      shouldExposeDocs: false
    });

    const response = await request(app)
      .post("/api/v1/auth/mfa/challenge")
      .send({
        challengeToken: "mfa_token_for_test",
        totpCode: validTotp
      })
      .expect(200);

    assert.equal(response.body.mfaRequired, false);
    assert.equal(response.body.session.userId, "user_1");
    assert.equal(response.body.session.tenantId, "tenant_1");
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});

void test("auth logout returns 200 for a valid session token", async () => {
  const expiresAt = new Date(Date.now() + 60_000);
  const sessionToken = "atk_valid";

  const restores = [
    stubMethod(prisma.session, "findUnique", async () => ({
      expiresAt,
      id: "session_1",
      organizationId: "org_1",
      tenantId: "tenant_1",
      revokedAt: null,
      userId: "user_1"
    })),
    stubMethod(prisma.user, "findUnique", async () => ({
      id: "user_1",
      status: UserStatus.ACTIVE
    })),
    stubMethod(prisma.session, "update", async () => ({ id: "session_1" }))
  ];

  try {
    const app = createAuthTestApp();
    const response = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${sessionToken}`)
      .set("x-csrf-token", "csrf_1")
      .set("Cookie", ["bh360_csrf=csrf_1"])
      .expect(200);

    assert.equal(response.body.revokedSessions, 1);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});

void test("auth protected endpoint returns 401 for expired or invalid session tokens", async () => {
  const app = createAuthTestApp();

  let restore = stubMethod(prisma.session, "findUnique", async () => ({
    expiresAt: new Date(Date.now() - 60_000),
    id: "session_expired",
    organizationId: "org_1",
    tenantId: "tenant_1",
    revokedAt: null,
    userId: "user_1"
  }));

  await request(app).get("/api/v1/sessions").set("Authorization", "Bearer atk_expired").expect(401);
  restore();

  restore = stubMethod(prisma.session, "findUnique", async () => null);
  await request(app).get("/api/v1/sessions").set("Authorization", "Bearer atk_invalid").expect(401);
  restore();
});
