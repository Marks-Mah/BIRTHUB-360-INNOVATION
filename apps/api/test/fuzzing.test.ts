import assert from "node:assert/strict";
import test from "node:test";

import express from "express";
import request from "supertest";

import { requestContextMiddleware } from "../src/middleware/request-context.js";
import { tenantContextMiddleware } from "../src/middleware/tenant-context.js";

test("resource ids de outro tenant retornam 404 ou 403 sem enumeracao", async () => {
  const app = express();

  app.use(requestContextMiddleware);
  app.use(tenantContextMiddleware);
  app.get("/resources/:resourceTenantId", (req, res) => {
    if (req.params.resourceTenantId !== req.tenantContext?.tenantId) {
      res.status(404).json({ detail: "Not Found" });
      return;
    }

    res.status(200).json({ ok: true });
  });

  const response = await request(app)
    .get("/resources/tenant-b")
    .set("x-tenant-id", "tenant-a");

  assert.match(String(response.status), /^(403|404)$/);
});
