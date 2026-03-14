import type { ZodType } from "zod";

import { PolicyDeniedError, type PolicyContext, type PolicyEngine } from "../policy/engine.js";

export interface ToolCostMetadata {
  estimatedCostUsd?: number;
  unit?: "call" | "token";
}

export interface ToolExecutionContext {
  agentId: string;
  tenantId: string;
  action?: string;
  timeoutMs?: number;
  policyContext?: PolicyContext;
  allowlistedDomains?: string[];
  traceId?: string;
}

export interface ToolDefinition<TInput, TOutput> {
  name: string;
  description?: string;
  inputSchema: ZodType<TInput>;
  outputSchema: ZodType<TOutput>;
  timeoutMs?: number;
  cost?: ToolCostMetadata;
}

export interface BaseToolOptions {
  policyEngine?: PolicyEngine;
}

export abstract class BaseTool<TInput, TOutput> {
  readonly name: string;
  readonly description: string | undefined;
  readonly timeoutMs: number;
  readonly cost: ToolCostMetadata | undefined;
  protected readonly inputSchema: ZodType<TInput>;
  protected readonly outputSchema: ZodType<TOutput>;
  protected readonly policyEngine: PolicyEngine | undefined;

  constructor(definition: ToolDefinition<TInput, TOutput>, options: BaseToolOptions = {}) {
    this.name = definition.name;
    this.description = definition.description;
    this.inputSchema = definition.inputSchema;
    this.outputSchema = definition.outputSchema;
    this.timeoutMs = definition.timeoutMs ?? 30_000;
    this.cost = definition.cost;
    this.policyEngine = options.policyEngine;
  }

  async run(rawInput: unknown, context: ToolExecutionContext): Promise<TOutput> {
    const input = this.inputSchema.parse(rawInput);
    const action = context.action ?? `tool.${this.name}`;

    if (this.policyEngine) {
      const evaluation = this.policyEngine.evaluate(context.agentId, action, context.policyContext ?? context);
      if (!evaluation.granted) {
        throw new PolicyDeniedError(evaluation.reason);
      }
    }

    const timeoutMs = context.timeoutMs ?? this.timeoutMs;
    const output = await this.withTimeout(this.execute(input, context), timeoutMs);
    return this.outputSchema.parse(output);
  }

  protected abstract execute(input: TInput, context: ToolExecutionContext): Promise<TOutput>;

  private async withTimeout<TResult>(promise: Promise<TResult>, timeoutMs: number): Promise<TResult> {
    let timeoutHandle: NodeJS.Timeout | undefined;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Tool '${this.name}' timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }
}
