import assert from "node:assert/strict";
import test from "node:test";

import { PrismaClient, WorkflowStatus } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "";
const testIfDatabase = databaseUrl ? test : test.skip;

void testIfDatabase("migracao preserva integridade referencial por tenant", async () => {
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
        name: "Migration Tenant A",
        slug: `migration-a-${Date.now()}`
      }
    });

    const organizationB = await prisma.organization.create({
      data: {
        name: "Migration Tenant B",
        slug: `migration-b-${Date.now()}`
      }
    });

    const workflowA = await prisma.workflow.create({
      data: {
        name: "Workflow A",
        organizationId: organizationA.id,
        status: WorkflowStatus.PUBLISHED,
        tenantId: organizationA.tenantId
      }
    });

    const createdUser = await prisma.user.create({
      data: {
        email: `cross-tenant-${Date.now()}@birthub.local`,
        name: "Cross Tenant User"
      }
    });

    const membershipB = await prisma.membership.create({
      data: {
        organizationId: organizationB.id,
        role: "MEMBER",
        tenantId: organizationB.tenantId,
        userId: createdUser.id
      }
    });

    assert.notEqual(workflowA.tenantId, membershipB.tenantId);
    assert.equal(workflowA.tenantId, organizationA.tenantId);
    assert.equal(membershipB.tenantId, organizationB.tenantId);
  } finally {
    await prisma.$disconnect();
  }
});
