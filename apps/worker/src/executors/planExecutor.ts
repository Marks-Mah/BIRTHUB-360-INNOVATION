import { createHash } from "node:crypto";

import {
  DbReadTool,
  DbWriteTool,
  HttpTool,
  SendEmailTool,
  type BaseTool
} from "@birthub/agents-core/tools";
import { PolicyEngine } from "@birthub/agents-core/policy/engine";
import { createLogger } from "@birthub/logger";
import type { Redis } from "ioredis";

const logger = createLogger("plan-executor");

const RETRY_DELAYS_MS = [1_000, 5_000, 30_000];
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
  estimatedCostBrl: number;
  output: unknown;
  startedAt: string;
  finishedAt: string;
}

export interface PlanExecutionResult {
  executionId: string;
  tenantId: string;
  agentId: string;
  cached: boolean;
  estimatedCostBrlTotal: number;
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

type ToolCostEstimator = (input: {
  call: PlannedToolCall;
  tool: BaseTool<unknown, unknown>;
}) => number;

export interface PlanExecutorOptions {
  hooks?: {
    onExecutionCompleted?: (result: PlanExecutionResult) => Promise<void> | void;
    onPlanBuilt?: (
      toolCalls: PlannedToolCall[],
      request: AgentExecutionRequest
    ) => Promise<void> | void;
    onStepCompleted?: (
      step: PlanExecutionStep,
      context: {
        index: number;
        request: AgentExecutionRequest;
        total: number;
      }
    ) => Promise<void> | void;
  };
  circuitBreaker?: {
    cooldownMs?: number;
    failureThreshold?: number;
  };
  executionTimeoutMs?: number;
  maxCostBrl?: number;
  maxPlanSteps?: number;
  planner?: PlanBuilder;
  redis: Redis;
  retryAttempts?: number;
  sensitiveFields?: string[];
  toolCostEstimator?: ToolCostEstimator;
  tools?: Record<string, BaseTool<unknown, unknown>>;
}

type CircuitBreakerState = {
  failureCount: number;
  openUntil: number | null;
};

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

function createExecutorError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
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
  private readonly hooks: NonNullable<PlanExecutorOptions["hooks"]>;
  private readonly circuitBreakerCooldownMs: number;
  private readonly circuitBreakerFailureThreshold: number;
  private readonly executionTimeoutMs: number | null;
  private readonly maxCostBrl: number | null;
  private readonly maxPlanSteps: number | null;
  private readonly retryAttempts: number;
  private readonly toolCostEstimator: ToolCostEstimator;
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();

  constructor(options: PlanExecutorOptions) {
    this.redis = options.redis;
    this.tools = options.tools ?? createDefaultTools();
    this.planner = options.planner ?? new MockPlanBuilder();
    this.sensitiveFields = options.sensitiveFields ?? ["cpf", "email", "credit_card"];
    this.hooks = options.hooks ?? {};
    this.circuitBreakerCooldownMs = options.circuitBreaker?.cooldownMs ?? 60_000;
    this.circuitBreakerFailureThreshold = options.circuitBreaker?.failureThreshold ?? 3;
    this.executionTimeoutMs = options.executionTimeoutMs ?? null;
    this.maxCostBrl = options.maxCostBrl ?? null;
    this.maxPlanSteps = options.maxPlanSteps ?? null;
    this.retryAttempts = options.retryAttempts ?? 5;
    this.toolCostEstimator =
      options.toolCostEstimator ??
      (({ tool }) =>
        typeof tool.cost?.estimatedCostUsd === "number" && Number.isFinite(tool.cost.estimatedCostUsd)
          ? tool.cost.estimatedCostUsd
          : 0);
  }

  private resultKey(executionId: string): string {
    return `exec_result:${executionId}`;
  }

  private lockKey(executionId: string): string {
    return `exec_lock:${executionId}`;
  }

  private assertExecutionBudget(estimatedCostBrl: number, currentTotal: number): void {
    if (this.maxCostBrl === null) {
      return;
    }

    const nextTotal = currentTotal + estimatedCostBrl;
    if (nextTotal > this.maxCostBrl) {
      throw createExecutorError(
        "AGENT_COST_LIMIT_EXCEEDED",
        `Execution exceeded the configured cost ceiling (${this.maxCostBrl.toFixed(2)} BRL).`
      );
    }
  }

  private assertExecutionDeadline(startedAtMs: number): void {
    if (this.executionTimeoutMs === null) {
      return;
    }

    const elapsedMs = Date.now() - startedAtMs;
    if (elapsedMs >= this.executionTimeoutMs) {
      throw createExecutorError(
        "AGENT_EXECUTION_TIMEOUT",
        `Execution exceeded the configured timeout (${this.executionTimeoutMs}ms).`
      );
    }
  }

  private assertPlanSize(toolCalls: PlannedToolCall[]): void {
    if (this.maxPlanSteps === null) {
      return;
    }

    if (toolCalls.length > this.maxPlanSteps) {
      throw createExecutorError(
        "AGENT_PLAN_TOO_LARGE",
        `Generated plan has ${toolCalls.length} step(s), above the configured limit of ${this.maxPlanSteps}.`
      );
    }
  }

  private estimateToolCost(
    call: PlannedToolCall,
    tool: BaseTool<unknown, unknown>
  ): number {
    const estimated = this.toolCostEstimator({ call, tool });

    if (!Number.isFinite(estimated) || estimated < 0) {
      return 0;
    }

    return Math.round(estimated * 100) / 100;
  }

  private getCircuitBreakerState(toolName: string): CircuitBreakerState {
    const current = this.circuitBreakers.get(toolName);
    if (current) {
      if (current.openUntil !== null && current.openUntil <= Date.now()) {
        const reset = { failureCount: 0, openUntil: null };
        this.circuitBreakers.set(toolName, reset);
        return reset;
      }

      return current;
    }

    const next = { failureCount: 0, openUntil: null };
    this.circuitBreakers.set(toolName, next);
    return next;
  }

  private assertCircuitOpen(toolName: string): void {
    const state = this.getCircuitBreakerState(toolName);
    if (state.openUntil !== null && state.openUntil > Date.now()) {
      throw createExecutorError(
        "AGENT_TOOL_CIRCUIT_OPEN",
        `Tool '${toolName}' is temporarily blocked by the circuit breaker.`
      );
    }
  }

  private markToolSuccess(toolName: string): void {
    this.circuitBreakers.set(toolName, {
      failureCount: 0,
      openUntil: null
    });
  }

  private markToolFailure(toolName: string): void {
    const state = this.getCircuitBreakerState(toolName);
    const failureCount = state.failureCount + 1;
    const openUntil =
      failureCount >= this.circuitBreakerFailureThreshold
        ? Date.now() + this.circuitBreakerCooldownMs
        : null;

    this.circuitBreakers.set(toolName, {
      failureCount,
      openUntil
    });
  }

  private resolveToolTimeout(
    tool: BaseTool<unknown, unknown>,
    executionStartedAtMs: number
  ): number {
    if (this.executionTimeoutMs === null) {
      return tool.timeoutMs;
    }

    const remainingMs = this.executionTimeoutMs - (Date.now() - executionStartedAtMs);
    if (remainingMs <= 0) {
      throw createExecutorError(
        "AGENT_EXECUTION_TIMEOUT",
        `Execution exceeded the configured timeout (${this.executionTimeoutMs}ms).`
      );
    }

    const rawTimeoutMs: unknown = tool.timeoutMs;
    const toolTimeoutMs =
      typeof rawTimeoutMs === "number" && Number.isFinite(rawTimeoutMs)
        ? rawTimeoutMs
        : remainingMs;

    return Math.max(1, Math.min(toolTimeoutMs, remainingMs));
  }

  private async executeWithRetry<TOutput>(input: {
    executionStartedAtMs: number;
    executor: (timeoutMs: number) => Promise<TOutput>;
    tool: BaseTool<unknown, unknown>;
    toolName: string;
  }): Promise<TOutput> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < this.retryAttempts) {
      this.assertExecutionDeadline(input.executionStartedAtMs);
      this.assertCircuitOpen(input.toolName);

      try {
        const timeoutMs = this.resolveToolTimeout(input.tool, input.executionStartedAtMs);
        const result = await input.executor(timeoutMs);
        this.markToolSuccess(input.toolName);
        return result;
      } catch (error) {
        lastError = error;
        if ((error as { code?: string } | undefined)?.code === "AGENT_TOOL_CIRCUIT_OPEN") {
          throw error;
        }

        if (attempt >= this.retryAttempts - 1) {
          break;
        }

        const delay =
          RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)] ??
          RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1] ??
          1_000;

        await wait(jitter(delay));
      }

      attempt += 1;
    }

    this.markToolFailure(input.toolName);
    throw lastError instanceof Error ? lastError : new Error("PlanExecutor failed after retries.");
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
    const executionStartedAtMs = Date.now();

    try {
      const toolCalls = request.toolCalls ?? (await this.planner.build(request));
      this.assertPlanSize(toolCalls);
      await this.hooks.onPlanBuilt?.(toolCalls, request);

      const steps: PlanExecutionStep[] = [];
      let recursiveContext: Record<string, unknown> = {
        ...request.input
      };
      let estimatedCostBrlTotal = 0;

      logger.info(
        {
          estimatedCostBrlTotal,
          executionDigest: buildExecutionDigest(request),
          executionId: request.executionId,
          redactedInput: request.input,
          tenantId: request.tenantId,
          toolCalls: toolCalls.length
        },
        "PlanExecutor started execution"
      );

      for (let index = 0; index < toolCalls.length; index += 1) {
        this.assertExecutionDeadline(executionStartedAtMs);

        const call = toolCalls[index];
        if (!call) {
          throw new Error(`Tool call at index ${index} is missing.`);
        }

        const tool = this.tools[call.tool];
        if (!tool) {
          throw new Error(`Tool '${call.tool}' is not registered.`);
        }

        const estimatedCostBrl = this.estimateToolCost(call, tool);
        this.assertExecutionBudget(estimatedCostBrl, estimatedCostBrlTotal);

        const startedAt = new Date().toISOString();
        const output = await this.executeWithRetry({
          executionStartedAtMs,
          executor: (timeoutMs) =>
            tool.run(call.input, {
              agentId: request.agentId,
              policyContext: { tenantId: request.tenantId },
              tenantId: request.tenantId,
              timeoutMs,
              traceId: request.executionId
            }),
          tool,
          toolName: call.tool
        });
        const finishedAt = new Date().toISOString();
        estimatedCostBrlTotal = Math.round((estimatedCostBrlTotal + estimatedCostBrl) * 100) / 100;

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
          estimatedCostBrl,
          finishedAt,
          output,
          startedAt
        };
        steps.push(step);
        await this.hooks.onStepCompleted?.(step, {
          index: index + 1,
          request,
          total: toolCalls.length
        });

        recursiveContext = {
          ...recursiveContext,
          [`step_${index + 1}`]: output
        };
      }

      const result: PlanExecutionResult = {
        agentId: request.agentId,
        cached: false,
        estimatedCostBrlTotal,
        executionId: request.executionId,
        output: recursiveContext,
        steps,
        tenantId: request.tenantId,
        trace: {
          id: traceRootId,
          nodes: traceNodes
        }
      };

      await this.redis.set(
        this.resultKey(request.executionId),
        JSON.stringify(result),
        "EX",
        EXEC_RESULT_TTL_SECONDS
      );
      await this.hooks.onExecutionCompleted?.(result);
      return result;
    } finally {
      await this.redis.del(this.lockKey(request.executionId));
    }
  }
}
