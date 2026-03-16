import { performance } from "node:perf_hooks";

import { BaseTool } from "@birthub/agents-core/tools";
import { z } from "zod";

import { PlanExecutor, type AgentExecutionRequest } from "../executors/planExecutor.js";

class InMemoryRedis {
  private readonly data = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const value = this.data.get(key);
    if (!value) {
      return null;
    }

    if (value.expiresAt !== undefined && value.expiresAt <= Date.now()) {
      this.data.delete(key);
      return null;
    }

    return value.value;
  }

  async set(key: string, value: string, ...args: Array<string | number>): Promise<"OK" | null> {
    const options = args.map((item) => String(item).toUpperCase());
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

class FastTool extends BaseTool<{ value: number }, { value: number }> {
  constructor() {
    super({
      inputSchema: z.object({ value: z.number() }).strict(),
      name: "fast",
      outputSchema: z.object({ value: z.number() }).strict()
    });
  }

  protected async execute(input: { value: number }): Promise<{ value: number }> {
    return { value: input.value + 1 };
  }
}

export interface ParallelLoadMetrics {
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  totalMs: number;
  successCount: number;
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * p));
  return sortedValues[index] ?? 0;
}

export async function runParallelExecutionLoadTest(totalExecutions: number = 50): Promise<ParallelLoadMetrics> {
  const redis = new InMemoryRedis();
  const executor = new PlanExecutor({
    redis: redis as never,
    tools: {
      fast: new FastTool() as BaseTool<unknown, unknown>
    }
  });

  const requests: AgentExecutionRequest[] = Array.from({ length: totalExecutions }).map((_, index) => ({
    agentId: "load-agent",
    executionId: `load-${index}`,
    input: {},
    tenantId: "tenant-load",
    toolCalls: [
      {
        input: { value: index },
        tool: "fast"
      }
    ]
  }));

  const startedAt = performance.now();
  const samples: number[] = [];

  await Promise.all(
    requests.map(async (request) => {
      const requestStartedAt = performance.now();
      await executor.execute(request);
      samples.push(performance.now() - requestStartedAt);
    })
  );

  const totalMs = performance.now() - startedAt;
  samples.sort((left, right) => left - right);

  return {
    p50Ms: percentile(samples, 0.5),
    p95Ms: percentile(samples, 0.95),
    p99Ms: percentile(samples, 0.99),
    successCount: samples.length,
    totalMs
  };
}
