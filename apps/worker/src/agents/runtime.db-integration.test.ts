import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

import { provisionTestDatabase } from "@birthub/testing";

void test("Manifest runtime integration persists memory, output, approval and metrics", async (context) => {
  const baseDatabaseUrl = process.env.DATABASE_URL;

  if (!baseDatabaseUrl) {
    context.skip("DATABASE_URL is not configured for integration test.");
    return;
  }

  const handle = await provisionTestDatabase(baseDatabaseUrl);

  try {
    const organization = await handle.prisma.organization.create({
      data: {
        name: "Runtime Integration Org",
        slug: "runtime-integration-org",
        tenantId: "tenant_runtime_integration"
      }
    });
    const user = await handle.prisma.user.create({
      data: {
        email: "runtime-integration@birthub.local",
        name: "Runtime Integration User"
      }
    });
    const agent = await handle.prisma.agent.create({
      data: {
        config: {
          sourceAgentId: "ceo-pack",
          status: "installed"
        },
        name: "CEO Installed",
        organizationId: organization.id,
        tenantId: organization.tenantId
      }
    });
    const execution = await handle.prisma.agentExecution.create({
      data: {
        agentId: agent.id,
        id: "runtime-exec-1",
        input: {
          company: "Acme Orbit",
          objective: "Avaliar sinais comerciais da conta",
          sessionId: "runtime-session-1",
          tenantId: organization.tenantId
        },
        organizationId: organization.id,
        status: "RUNNING",
        tenantId: organization.tenantId,
        userId: user.id
      }
    });

    const harnessPath = resolve(import.meta.dirname, "./runtime.db-integration.harness.ts");
    const stdout = execFileSync(process.execPath, ["--import", "tsx", harnessPath], {
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: handle.databaseUrl,
        REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
        RUNTIME_TEST_AGENT_ID: agent.id,
        RUNTIME_TEST_EXECUTION_ID: execution.id,
        RUNTIME_TEST_ORGANIZATION_ID: organization.id,
        RUNTIME_TEST_TENANT_ID: organization.tenantId,
        RUNTIME_TEST_USER_ID: user.id
      },
      timeout: 30_000
    });
    const jsonLine = stdout
      .trim()
      .split(/\r?\n/)
      .reverse()
      .find((line) => line.trim().startsWith("{"));

    assert.ok(jsonLine, "Runtime harness did not emit a JSON payload.");

    const result = JSON.parse(jsonLine) as {
      approvedOutputStatus: string | null;
      budgetEventKinds: string[];
      executionStatus: string;
      learningPublishedCount: number;
      memoryEntryCount: number;
      metrics: {
        execution_count: number;
        tool_cost: number;
      };
      outputCount: number;
    };

    assert.equal(result.outputCount, 1);
    assert.equal(result.executionStatus, "SUCCESS");
    assert.equal(result.approvedOutputStatus, "COMPLETED");
    assert.ok(result.memoryEntryCount > 0);
    assert.ok(result.learningPublishedCount > 0);
    assert.ok(result.metrics.execution_count >= 1);
    assert.ok(result.metrics.tool_cost > 0);
    assert.ok(result.budgetEventKinds.includes("CONSUME"));
  } finally {
    await handle.cleanup();
  }
});
