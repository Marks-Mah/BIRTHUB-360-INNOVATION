import assert from "node:assert/strict";
import test from "node:test";

import express from "express";
import request from "supertest";

import { requestContextMiddleware } from "../src/middleware/request-context.js";
import { tenantContextMiddleware } from "../src/middleware/tenant-context.js";

void test("contexto de tenant nao e materializado a partir de headers crus", async () => {
  const app = express();

  app.use(requestContextMiddleware);
  app.use(tenantContextMiddleware);
  app.get("/echo", (req, res) => {
    res.status(200).json({
      contextTenantId: req.context.tenantId,
      tenantId: req.tenantContext?.tenantId ?? null
    });
  });

  const [tenantA, tenantB] = await Promise.all([
    request(app).get("/echo").set("x-tenant-id", "tenant-a"),
    request(app).get("/echo").set("x-tenant-id", "tenant-b")
  ]);

  assert.equal(tenantA.body.tenantId, null);
  assert.equal(tenantA.body.contextTenantId, null);
  assert.equal(tenantB.body.tenantId, null);
  assert.equal(tenantB.body.contextTenantId, null);
});
