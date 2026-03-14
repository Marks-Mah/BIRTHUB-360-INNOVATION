import { createHash } from "node:crypto";

import {
  DbReadTool,
  DbWriteTool,
  HttpTool,
  PolicyEngine,
  SendEmailTool,
  type BaseTool,
  redactPII
} from "@birthub/agents-core";
import { createLogger } from "@birthub/logger";
import type { Redis } from "ioredis";

const logger = createLogger("plan-executor");

const RETRY_DELAYS_MS = [1000, 5000, 30_000];
const EXEC_RESULT_TTL_SECONDS = 60 * 60;
const EXEC_LOCK_TTL_SECONDS = 60 * 15;

export interface PlannedToolCall {
  tool: string;
  input: unknown;
}

export interface AgentExecutionRequest {
  executionId: string;
  agentId: string;
  tenantId: string;
  input: Record<string, unknown>;
  toolCalls?: PlannedToolCall[];
}

export interface PlanExecutionStep {
  call: PlannedToolCall;
  output: unknown;
  startedAt: string;
  finishedAt: string;
}

export interface PlanExecutionResult {
  executionId: string;
  tenantId: string;
  agentId: string;
  cached: boolean;
  output: Record<string, unknown>;
  steps: PlanExecutionStep[];
  trace: {
    id: string;
    nodes: Array<{
      id: string;
      type: "plan" | "result" | "tool";
      label: string;
      parentId?: string;
    }>;
  };
}

export interface PlanBuilder {
  build(input: AgentExecutionRequest): Promise<PlannedToolCall[]>;
}

export interface PlanExecutorOptions {
  redis: Redis;
  tools?: Record<string, BaseTool<unknown, unknown>>;
  planner?: PlanBuilder;
  sensitiveFields?: string[];
}

class MockPlanBuilder implements PlanBuilder {
  async build(input: AgentExecutionRequest): Promise<PlannedToolCall[]> {
    const providedCalls = input.input.toolCalls;
    if (Array.isArray(providedCalls)) {
      return providedCalls.filter((value): value is PlannedToolCall => {
        return (
          typeof value === "object" &&
          value !== null &&
          "tool" in value &&
          "input" in value &&
          typeof (value as { tool?: unknown }).tool === "string"
        );
      });
    }

    return [];
  }
}

function buildExecutionDigest(input: AgentExecutionRequest): string {
  return createHash("sha256")
    .update(JSON.stringify({ input: input.input, toolCalls: input.toolCalls }))
    .digest("hex");
}

function jitter(delayMs: number): number {
  const spread = Math.floor(delayMs * 0.15);
  const randomDelta = Math.floor(Math.random() * (spread + 1));
  return delayMs + randomDelta;
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function createDefaultTools(): Record<string, BaseTool<unknown, unknown>> {
  const policyEngine = new PolicyEngine([
    {
      action: "tool.*",
      effect: "allow",
      id: "default-allow-tools"
    }
  ]);

  const memoryRows: Record<string, unknown>[] = [];

  return {
    "db-read": new DbReadTool({
      executor: async ({ tenantId }) => memoryRows.filter((row) => row.tenantId === tenantId),
      policyEngine
    }) as BaseTool<unknown, unknown>,
    "db-write": new DbWriteTool({
      auditPublisher: async (event) => {
        logger.info({ event }, "db-write audit event emitted");
      },
      executor: async ({ data, tenantId }) => {
        memoryRows.push({ ...data, tenantId });
        return 1;
      },
      policyEngine
    }) as BaseTool<unknown, unknown>,
    http: new HttpTool({ policyEngine }) as BaseTool<unknown, unknown>,
    "send-email": new SendEmailTool({ policyEngine }) as BaseTool<unknown, unknown>
  };
}

export class PlanExecutor {
  private readonly planner: PlanBuilder;
  private readonly redis: Redis;
  private readonly sensitiveFields: string[];
  private readonly tools: Record<string, BaseTool<unknown, unknown>>;

  constructor(options: PlanExecutorOptions) {
    this.redis = options.redis;
    this.tools = options.tools ?? createDefaultTools();
    this.planner = options.planner ?? new MockPlanBuilder();
    this.sensitiveFields = options.sensitiveFields ?? ["cpf", "email", "credit_card"];
  }

  private resultKey(executionId: string): string {
    return `exec_result:${executionId}`;
  }

  private lockKey(executionId: string): string {
    return `exec_lock:${executionId}`;
  }

  async execute(request: AgentExecutionRequest): Promise<PlanExecutionResult> {
    const cachedResult = await this.redis.get(this.resultKey(request.executionId));
    if (cachedResult) {
      return {
        ...(JSON.parse(cachedResult) as PlanExecutionResult),
        cached: true
      };
    }

    const lockStatus = await this.redis.set(
      this.lockKey(request.executionId),
      "running",
      "EX",
      EXEC_LOCK_TTL_SECONDS,
      "NX"
    );

    if (lockStatus !== "OK") {
      throw new Error(`Execution '${request.executionId}' is already running.`);
    }

    const traceRootId = `trace_${request.executionId}`;
    const traceNodes: PlanExecutionResult["trace"]["nodes"] = [
      {
        id: traceRootId,
        label: `agent:${request.agentId}`,
        type: "plan"
      }
    ];

    try {
      const toolCalls = request.toolCalls ?? (await this.planner.build(request));
      const steps: PlanExecutionStep[] = [];
      let recursiveContext: Record<string, unknown> = {
        ...request.input
      };

      logger.info(
        {
          executionDigest: buildExecutionDigest(request),
          executionId: request.executionId,
          redactedInput: redactPII(request.input, this.sensitiveFields),
          tenantId: request.tenantId,
          toolCalls: toolCalls.length
        },
        "PlanExecutor started execution"
      );

      for (let index = 0; index < toolCalls.length; index += 1) {
        const call = toolCalls[index];
        if (!call) {
          throw new Error(`Tool call at index ${index} is missing.`);
        }
        const tool = this.tools[call.tool];

        if (!tool) {
          throw new Error(`Tool '${call.tool}' is not registered.`);
        }

        const startedAt = new Date().toISOString();
        const output = await this.executeWithRetry(() =>
          tool.run(call.input, {
            agentId: request.agentId,
            policyContext: { tenantId: request.tenantId },
            tenantId: request.tenantId,
            traceId: request.executionId
          })
        );
        const finishedAt = new Date().toISOString();

        const nodeId = `tool_${request.executionId}_${index + 1}`;
        traceNodes.push({
          id: nodeId,
          label: call.tool,
          parentId: traceRootId,
          type: "tool"
        });
        traceNodes.push({
          id: `${nodeId}_result`,
          label: "result",
          parentId: nodeId,
          type: "result"
        });

        const step: PlanExecutionStep = {
          call,
          finishedAt,
          output,
          startedAt
        };
        steps.push(step);

        recursiveContext = {
          ...recursiveContext,
          [`step_${index + 1}`]: output
        };
      }

      const result: PlanExecutionResult = {
        agentId: request.agentId,
        cached: false,
        executionId: request.executionId,
        output: recursiveContext,
        steps,
        tenantId: request.tenantId,
        trace: {
          id: traceRootId,
          nodes: traceNodes
        }
      };

      await this.redis.set(this.resultKey(request.executionId), JSON.stringify(result), "EX", EXEC_RESULT_TTL_SECONDS);
      return result;
    } finally {
      await this.redis.del(this.lockKey(request.executionId));
    }
  }

  private async executeWithRetry<TOutput>(executor: () => Promise<TOutput>): Promise<TOutput> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < 5) {
      try {
        return await executor();
      } catch (error) {
        lastError = error;
        const delay =
          RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)] ??
          RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1] ??
          1_000;
        if (attempt >= 4) {
          break;
        }

        await wait(jitter(delay));
      }

      attempt += 1;
    }

    throw lastError instanceof Error ? lastError : new Error("PlanExecutor failed after retries.");
  }
}
