import assert from "node:assert/strict";
import test from "node:test";

import jwt from "jsonwebtoken";

function createToken(secret: string): string {
  return jwt.sign(
    {
      roles: ["admin"],
      scopes: ["leads:write"],
      sub: "user_1",
      tenantId: "tenant_alpha"
    },
    secret
  );
}

async function startServer() {
  process.env.JWT_SECRET = "lead-test-secret";
  process.env.NODE_ENV = "test";

  const { default: app } = await import("../server.js");

  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.on("listening", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected test server address to resolve to a port");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  };
}

void test("POST /api/v1/leads rejects invalid payloads with structured validation details", async () => {
  const runtime = await startServer();

  try {
    const response = await fetch(`${runtime.baseUrl}/api/v1/leads`, {
      body: JSON.stringify({
        assignee: "A",
        email: "invalid-email",
        name: "A",
        score: 999,
        status: "NEW"
      }),
      headers: {
        "authorization": `Bearer ${createToken(process.env.JWT_SECRET ?? "lead-test-secret")}`,
        "content-type": "application/json",
        "x-tenant-id": "tenant_alpha"
      },
      method: "POST"
    });

    const payload = await response.json();

    assert.equal(response.status, 400);
    assert.equal(payload.code, "VALIDATION_ERROR");
    assert.ok(Array.isArray(payload.details?.errors));
    assert.ok(payload.details.errors.some((message: string) => message.includes("email")));
    assert.ok(payload.details.errors.some((message: string) => message.includes("score")));
  } finally {
    await runtime.close();
  }
});

void test("POST /api/v1/leads accepts valid payloads and binds the tenant from the token", async () => {
  const runtime = await startServer();

  try {
    const response = await fetch(`${runtime.baseUrl}/api/v1/leads`, {
      body: JSON.stringify({
        assignee: "sales.owner",
        email: "ada@birthhub.local",
        name: "Ada Lovelace",
        score: 91,
        status: "QUALIFIED"
      }),
      headers: {
        "authorization": `Bearer ${createToken(process.env.JWT_SECRET ?? "lead-test-secret")}`,
        "content-type": "application/json",
        "x-tenant-id": "tenant_alpha"
      },
      method: "POST"
    });

    const payload = await response.json();

    assert.equal(response.status, 201);
    assert.equal(payload.email, "ada@birthhub.local");
    assert.equal(payload.tenantId, "tenant_alpha");
    assert.equal(payload.score, 91);
  } finally {
    await runtime.close();
  }
});

void test("POST /api/v1/leads rejects tokens without tenantId", async () => {
  process.env.JWT_SECRET = "lead-test-secret";
  const runtime = await startServer();

  try {
    const token = jwt.sign(
      {
        roles: ["admin"],
        scopes: ["leads:write"],
        sub: "user_1"
      },
      process.env.JWT_SECRET ?? "lead-test-secret"
    );

    const response = await fetch(`${runtime.baseUrl}/api/v1/leads`, {
      body: JSON.stringify({
        assignee: "sales.owner",
        email: "grace@birthhub.local",
        name: "Grace Hopper",
        score: 88,
        status: "QUALIFIED"
      }),
      headers: {
        "authorization": `Bearer ${token}`,
        "content-type": "application/json"
      },
      method: "POST"
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.code, "MISSING_TENANT_CLAIM");
  } finally {
    await runtime.close();
  }
});
