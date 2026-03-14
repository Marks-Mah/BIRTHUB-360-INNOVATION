import assert from "node:assert/strict";
import test from "node:test";

import express from "express";
import request from "supertest";

import { requestContextMiddleware } from "../src/middleware/request-context.js";
import { tenantContextMiddleware } from "../src/middleware/tenant-context.js";

test("contexto de tenant nao vaza entre requests concorrentes", async () => {
  const app = express();

  app.use(requestContextMiddleware);
  app.use(tenantContextMiddleware);
  app.get("/echo", (req, res) => {
    res.status(200).json({
      tenantId: req.tenantContext?.tenantId ?? null
    });
  });

  const [tenantA, tenantB] = await Promise.all([
    request(app).get("/echo").set("x-tenant-id", "tenant-a"),
    request(app).get("/echo").set("x-tenant-id", "tenant-b")
  ]);

  assert.equal(tenantA.body.tenantId, "tenant-a");
  assert.equal(tenantB.body.tenantId, "tenant-b");
});
