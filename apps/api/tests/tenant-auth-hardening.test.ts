import assert from "node:assert/strict";
import test from "node:test";

import { MembershipStatus, Role, UserStatus, prisma } from "@birthub/database";
import request from "supertest";

import { createApp } from "../src/app.js";
import { sha256 } from "../src/modules/auth/crypto.js";
import { createTestApiConfig } from "./test-config.js";

function stubMethod(target: object, key: string, value: unknown): () => void {
  const original = Reflect.get(target, key);
  Reflect.set(target, key, value);
  return () => {
    Reflect.set(target, key, original);
  };
}

function createSecurityApp() {
  return createApp({
    config: createTestApiConfig(),
    shouldExposeDocs: false
  });
}

function createSessionStubs(options?: {
  memberships?: Record<string, Role | null>;
  token?: string;
}) {
  const token = options?.token ?? "atk_valid";
  const memberships = options?.memberships ?? {
    org_1: Role.ADMIN
  };

  return [
    stubMethod(prisma.session, "findUnique", async (args: { where?: { token?: string } }) => {
      if (args.where?.token !== sha256(token)) {
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
    stubMethod(prisma.organization, "findFirst", async (args: { where?: { OR?: Array<Record<string, string>> } }) => {
      const references = args.where?.OR ?? [];
      const values = references.flatMap((entry) => Object.values(entry));

      if (values.includes("org_1") || values.includes("tenant_1") || values.includes("tenant-one")) {
        return {
          id: "org_1",
          slug: "tenant-one",
          tenantId: "tenant_1"
        };
      }

      if (values.includes("org_2") || values.includes("tenant_2") || values.includes("tenant-two")) {
        return {
          id: "org_2",
          slug: "tenant-two",
          tenantId: "tenant_2"
        };
      }

      return null;
    }),
    stubMethod(prisma.membership, "findUnique", async (args: {
      where?: { organizationId_userId?: { organizationId?: string; userId?: string } };
    }) => {
      const organizationId = args.where?.organizationId_userId?.organizationId;
      const role = organizationId ? memberships[organizationId] : null;

      if (!organizationId || !role) {
        return null;
      }

      return {
        organizationId,
        role,
        status: MembershipStatus.ACTIVE,
        userId: "user_1"
      };
    })
  ];
}

void test("tasks reject anonymous and header-only requests", async () => {
  const app = createSecurityApp();

  await request(app)
    .post("/api/v1/tasks")
    .set("x-csrf-token", "csrf_1")
    .set("Cookie", ["bh360_csrf=csrf_1"])
    .send({ type: "send-welcome-email" })
    .expect(401);

  await request(app)
    .post("/api/v1/tasks")
    .set("x-tenant-id", "tenant_1")
    .set("x-csrf-token", "csrf_1")
    .set("Cookie", ["bh360_csrf=csrf_1"])
    .send({ type: "send-welcome-email" })
    .expect(401);
});

void test("workflows reject header spoofing and forged bearer tokens", async () => {
  const restore = stubMethod(prisma.session, "findUnique", async () => null);

  try {
    const app = createSecurityApp();

    await request(app)
      .get("/api/v1/workflows")
      .set("x-tenant-id", "tenant_1")
      .expect(401);

    await request(app)
      .get("/api/v1/workflows")
      .set("Authorization", "Bearer forged.jwt.token")
      .expect(401);
  } finally {
    restore();
  }
});

void test("tenant switch requires authenticated membership", async () => {
  const restores = [
    ...createSessionStubs({
      memberships: {
        org_1: Role.ADMIN,
        org_2: null
      }
    })
  ];

  try {
    const app = createSecurityApp();

    await request(app)
      .get("/api/v1/workflows")
      .set("Authorization", "Bearer atk_valid")
      .set("x-active-tenant", "tenant_2")
      .expect(403);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});

void test("authenticated tenant switch succeeds when membership is valid", async () => {
  const restores = [
    ...createSessionStubs({
      memberships: {
        org_1: Role.ADMIN,
        org_2: Role.ADMIN
      }
    }),
    stubMethod(prisma.workflow, "findMany", async () => [])
  ];

  try {
    const app = createSecurityApp();

    const response = await request(app)
      .get("/api/v1/workflows")
      .set("Authorization", "Bearer atk_valid")
      .set("x-active-tenant", "tenant_2")
      .expect(200);

    assert.deepEqual(response.body.items, []);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});

void test("administrative organization exports reject insufficient role", async () => {
  const restores = [
    ...createSessionStubs({
      memberships: {
        org_1: Role.MEMBER
      }
    })
  ];

  try {
    const app = createSecurityApp();

    await request(app)
      .get("/api/v1/orgs/org_1/audit/export")
      .set("Authorization", "Bearer atk_valid")
      .expect(403);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});

void test("agents and packs management reject anonymous access", async () => {
  const app = createSecurityApp();

  await request(app).get("/api/v1/agents/installed").expect(401);
  await request(app).get("/api/v1/packs/status").expect(401);
});

void test("dashboard endpoints reject anonymous and insufficient-role access", async () => {
  const app = createSecurityApp();

  await request(app).get("/api/v1/dashboard/metrics").expect(401);

  const restores = [
    ...createSessionStubs({
      memberships: {
        org_1: Role.MEMBER
      }
    })
  ];

  try {
    await request(app)
      .get("/api/v1/dashboard/metrics")
      .set("Authorization", "Bearer atk_valid")
      .expect(403);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});
