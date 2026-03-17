import assert from "node:assert/strict";
import test from "node:test";
import express from "express";

import { router } from "./supported.js";

async function startRouterServer() {
  const app = express();
  app.use(router);

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

void test("GET /agents/logs returns explicit deprecation payload", async () => {
  const runtime = await startRouterServer();

  try {
    const response = await fetch(`${runtime.baseUrl}/agents/logs`);
    const payload = await response.json();

    assert.equal(response.status, 410);
    assert.equal(payload.code, "LEGACY_AGENT_LOGS_DEPRECATED");
    assert.equal(typeof payload.message, "string");
    assert.equal(payload.deprecatedAt, "2026-03-17");
    assert.equal(payload.replacement, "Use canonical telemetry APIs behind apps/api.");
  } finally {
    await runtime.close();
  }
});
