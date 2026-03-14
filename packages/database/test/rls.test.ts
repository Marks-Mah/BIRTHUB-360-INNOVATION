import assert from "node:assert/strict";
import test from "node:test";

import { PrismaClient, WorkflowStatus } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "";
const testIfDatabase = databaseUrl ? test : test.skip;

testIfDatabase("RLS bloqueia SELECT de tenant B quando a sessao esta fixada no tenant A", async () => {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  try {
    const organizationA = await prisma.organization.create({
      data: {
        name: "Tenant A",
        slug: `tenant-a-${Date.now()}`
      }
    });

    const organizationB = await prisma.organization.create({
      data: {
        name: "Tenant B",
        slug: `tenant-b-${Date.now()}`
      }
    });

    const workflowB = await prisma.workflow.create({
      data: {
        name: "Workflow B",
        organizationId: organizationB.id,
        status: WorkflowStatus.PUBLISHED,
        tenantId: organizationB.tenantId
      }
    });

    const rows = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${organizationA.tenantId}, true)`;
      return tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM workflows WHERE id = ${workflowB.id}`;
    });

    assert.equal(rows.length, 0);
  } finally {
    await prisma.$disconnect();
  }
});
