import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@birthub/database";
import express from "express";
import request from "supertest";

import { setCacheStoreForTests } from "../src/common/cache/index.js";
import { requestContextMiddleware } from "../src/middleware/request-context.js";
import { tenantContextMiddleware } from "../src/middleware/tenant-context.js";

type StubTarget = Record<string, unknown>;

function stubMethod(target: StubTarget, key: string, value: unknown): () => void {
  const original = target[key];
  target[key] = value;
  return () => {
    target[key] = original;
  };
}

function createInMemoryCacheStore() {
  const entries = new Map<string, string>();

  return {
    async del(...keys: string[]) {
      let removed = 0;
      for (const key of keys) {
        if (entries.delete(key)) {
          removed += 1;
        }
      }
      return removed;
    },
    async get(key: string) {
      return entries.get(key) ?? null;
    },
    async set(key: string, value: string) {
      entries.set(key, value);
    }
  };
}

void test("tenant cache hit evita nova consulta ao Prisma no segundo request", async () => {
  const app = express();
  app.use(requestContextMiddleware);
  app.use(tenantContextMiddleware);
  app.get("/tenant", (req, res) => {
    res.status(200).json({
      tenantId: req.tenantContext?.tenantId ?? null
    });
  });

  let findFirstCount = 0;
  const restoreFindFirst = stubMethod(prisma.organization as unknown as StubTarget, "findFirst", async () => {
    findFirstCount += 1;
    return {
      id: "org_a",
      slug: "tenant-a",
      tenantId: "tenant-a"
    };
  });
  const previousDatabaseUrl = process.env.DATABASE_URL;

  process.env.DATABASE_URL = "postgresql://cache-test";
  setCacheStoreForTests(createInMemoryCacheStore());

  try {
    const firstResponse = await request(app).get("/tenant").set("x-tenant-id", "tenant-a").expect(200);
    const secondResponse = await request(app).get("/tenant").set("x-tenant-id", "tenant-a").expect(200);

    assert.equal(firstResponse.body.tenantId, "tenant-a");
    assert.equal(secondResponse.body.tenantId, "tenant-a");
    assert.equal(findFirstCount, 1);
  } finally {
    restoreFindFirst();
    process.env.DATABASE_URL = previousDatabaseUrl;
    setCacheStoreForTests(null);
  }
});
