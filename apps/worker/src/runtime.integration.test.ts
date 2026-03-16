import assert from "node:assert/strict";
import test from "node:test";

import { DbReadTool, DbWriteTool, type BaseTool } from "@birthub/agents-core/tools";
import { provisionTestDatabase } from "@birthub/testing";

import { PlanExecutor } from "./executors/planExecutor.js";

function readSeedValue(data: Record<string, unknown>, key: string, fallback: string): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

class InMemoryRedis {
  private readonly data = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<"OK"> {
    this.data.set(key, value);
    return "OK";
  }

  async del(key: string): Promise<number> {
    return this.data.delete(key) ? 1 : 0;
  }
}

void test("runtime integration executes db-write and db-read with real database", async (context) => {
  const baseDatabaseUrl = process.env.DATABASE_URL;

  if (!baseDatabaseUrl) {
    context.skip("DATABASE_URL is not configured for integration test.");
    return;
  }

  const handle = await provisionTestDatabase(baseDatabaseUrl);
  context.after(async () => {
    await handle.cleanup();
  });

  const dbWrite = new DbWriteTool({
    auditPublisher: async () => undefined,
    executor: async ({ data }) => {
      const created = await handle.prisma.organization.create({
        data: {
          name: readSeedValue(data, "name", "Integration Agent Org"),
          slug: readSeedValue(data, "slug", `integration-${Date.now()}`)
        }
      });
      return created ? 1 : 0;
    }
  });

  const dbRead = new DbReadTool({
    executor: async () => {
      return handle.prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          slug: true
        }
      });
    }
  });

  const executor = new PlanExecutor({
    redis: new InMemoryRedis() as never,
    tools: {
      "db-read": dbRead as BaseTool<unknown, unknown>,
      "db-write": dbWrite as BaseTool<unknown, unknown>
    }
  });

  const result = await executor.execute({
    agentId: "integration-agent",
    executionId: "integration-exec-1",
    input: {},
    tenantId: "tenant-int",
    toolCalls: [
      {
        input: {
          data: {
            name: "Integration Org",
            slug: `integration-${Date.now()}`
          },
          operation: "INSERT",
          table: "Organization",
          where: {}
        },
        tool: "db-write"
      },
      {
        input: {
          params: [],
          query: "SELECT id, name, slug FROM Organization"
        },
        tool: "db-read"
      }
    ]
  });

  assert.equal(result.steps.length, 2);
  assert.ok(result.output.step_2);
});
