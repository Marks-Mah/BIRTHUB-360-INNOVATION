import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";

import { PrismaClient } from "@birthub/database";

const databaseUrl = process.env.DATABASE_URL ?? "";
const testIfDatabase = databaseUrl ? test : test.skip;

void testIfDatabase("query com 10k registros de um tenant unico fica abaixo de 100ms", async () => {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  try {
    const organization = await prisma.organization.create({
      data: {
        name: "Performance Tenant",
        slug: `performance-${Date.now()}`
      }
    });

    await prisma.customer.createMany({
      data: Array.from({ length: 10_000 }, (_, index) => ({
        email: `perf-${index}@birthub.local`,
        name: `Perf Customer ${index}`,
        organizationId: organization.id,
        status: "active",
        tenantId: organization.tenantId
      }))
    });

    const startedAt = performance.now();

    await prisma.customer.findMany({
      orderBy: {
        id: "asc"
      },
      take: 100,
      where: {
        tenantId: organization.tenantId
      }
    });

    const durationMs = performance.now() - startedAt;
    assert.ok(durationMs < 100, `Expected query to finish under 100ms, received ${durationMs}ms`);
  } finally {
    await prisma.$disconnect();
  }
});
