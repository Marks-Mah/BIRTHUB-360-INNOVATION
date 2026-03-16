import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { InternalStateStore } from "./internal-state-store.js";

async function startServer(stateFilePath: string) {
  process.env.INTERNAL_SERVICE_TOKEN = "svc_test";
  process.env.JWT_SECRET = "internal-test-secret";
  process.env.API_GATEWAY_STATE_FILE = stateFilePath;
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

void test("internal routes reject requests without service token", async () => {
  const stateFilePath = path.join(os.tmpdir(), `api-gateway-internal-${Date.now()}-reject.json`);
  const runtime = await startServer(stateFilePath);

  try {
    const response = await fetch(`${runtime.baseUrl}/api/v1/internal/organizations/org_1/plan`, {
      body: JSON.stringify({ plan: "PRO" }),
      headers: {
        "content-type": "application/json"
      },
      method: "PATCH"
    });
    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.error, "missing_service_token");
  } finally {
    await runtime.close();
    await fs.rm(stateFilePath, { force: true });
  }
});

void test("internal routes persist organization plans behind the service token", async () => {
  const stateFilePath = path.join(os.tmpdir(), `api-gateway-internal-${Date.now()}-persist.json`);
  const runtime = await startServer(stateFilePath);

  try {
    const patchResponse = await fetch(`${runtime.baseUrl}/api/v1/internal/organizations/org_1/plan`, {
      body: JSON.stringify({ plan: "PRO" }),
      headers: {
        "content-type": "application/json",
        "x-service-token": "svc_test"
      },
      method: "PATCH"
    });
    const patchPayload = await patchResponse.json();
    const getResponse = await fetch(`${runtime.baseUrl}/api/v1/internal/organizations/org_1/plan`, {
      headers: {
        "x-service-token": "svc_test"
      }
    });
    const getPayload = await getResponse.json();

    assert.equal(patchResponse.status, 200);
    assert.equal(patchPayload.plan, "PRO");
    assert.equal(getResponse.status, 200);
    assert.equal(getPayload.plan, "PRO");
  } finally {
    await runtime.close();
    await fs.rm(stateFilePath, { force: true });
  }
});

void test("internal state store persists organization and activity state across instances", async () => {
  const stateFilePath = path.join(os.tmpdir(), `api-gateway-store-${Date.now()}.json`);
  const store = new InternalStateStore(stateFilePath);

  try {
    await store.setOrganizationPlan("org_1", "PRO");
    await store.setActivityStatus("activity_1", "OPENED");

    const reloadedStore = new InternalStateStore(stateFilePath);

    assert.equal(await reloadedStore.getOrganizationPlan("org_1"), "PRO");
    assert.equal(await reloadedStore.getActivityStatus("activity_1"), "OPENED");
  } finally {
    await fs.rm(stateFilePath, { force: true });
  }
});
