import assert from "node:assert/strict";
import test from "node:test";

import { BaseTool } from "@birthub/agents-core";
import { z } from "zod";

import { PlanExecutor, type AgentExecutionRequest } from "./executors/planExecutor.js";

class InMemoryRedis {
  private readonly data = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const current = this.data.get(key);
    if (!current) {
      return null;
    }

    if (current.expiresAt !== undefined && current.expiresAt <= Date.now()) {
      this.data.delete(key);
      return null;
    }

    return current.value;
  }

  async set(key: string, value: string, ...args: Array<string | number>): Promise<"OK" | null> {
    const options = args.map((arg) => String(arg).toUpperCase());
    const hasNx = options.includes("NX");
    const exIndex = options.indexOf("EX");
    const expiresAt =
      exIndex >= 0 && args[exIndex + 1] ? Date.now() + Number(args[exIndex + 1]) * 1000 : undefined;

    if (hasNx && this.data.has(key)) {
      return null;
    }

    this.data.set(key, {
      ...(expiresAt !== undefined ? { expiresAt } : {}),
      value
    });
    return "OK";
  }

  async del(key: string): Promise<number> {
    return this.data.delete(key) ? 1 : 0;
  }
}

class EchoTool extends BaseTool<{ text: string }, { echoed: string }> {
  constructor() {
    super({
      inputSchema: z.object({ text: z.string() }).strict(),
      name: "echo",
      outputSchema: z.object({ echoed: z.string() }).strict()
    });
  }

  protected async execute(input: { text: string }): Promise<{ echoed: string }> {
    return { echoed: input.text };
  }
}

void test("PlanExecutor executes tool calls in sequence", async () => {
  const redis = new InMemoryRedis();
  const executor = new PlanExecutor({
    redis: redis as never,
    tools: {
      echo: new EchoTool() as BaseTool<unknown, unknown>
    }
  });

  const request: AgentExecutionRequest = {
    agentId: "agent-1",
    executionId: "exec-1",
    input: {},
    tenantId: "tenant-1",
    toolCalls: [
      {
        input: { text: "hello" },
        tool: "echo"
      }
    ]
  };

  const result = await executor.execute(request);
  assert.equal(result.cached, false);
  assert.equal(result.steps.length, 1);
  assert.deepEqual(result.steps[0]?.output, { echoed: "hello" });
});

void test("PlanExecutor returns cached result for duplicate executionId", async () => {
  const redis = new InMemoryRedis();
  const executor = new PlanExecutor({
    redis: redis as never,
    tools: {
      echo: new EchoTool() as BaseTool<unknown, unknown>
    }
  });

  const request: AgentExecutionRequest = {
    agentId: "agent-2",
    executionId: "exec-2",
    input: {},
    tenantId: "tenant-2",
    toolCalls: [
      {
        input: { text: "memo" },
        tool: "echo"
      }
    ]
  };

  const first = await executor.execute(request);
  const second = await executor.execute(request);

  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
});

void test("PlanExecutor blocks execution when lock already exists", async () => {
  const redis = new InMemoryRedis();
  const executor = new PlanExecutor({
    redis: redis as never,
    tools: {
      echo: new EchoTool() as BaseTool<unknown, unknown>
    }
  });

  await redis.set("exec_lock:exec-3", "running", "EX", 60, "NX");

  await assert.rejects(
    () =>
      executor.execute({
        agentId: "agent-3",
        executionId: "exec-3",
        input: {},
        tenantId: "tenant-3",
        toolCalls: []
      }),
    /already running/
  );
});
