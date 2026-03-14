import { z, type ZodType } from "zod";

export interface ToolRuntimeContext {
  agentId: string;
  policyContext?: Record<string, unknown>;
  tenantId: string;
  traceId: string;
}

export interface PolicyRule {
  action: string;
  effect: "allow" | "deny";
  id: string;
}

function matchesRule(ruleAction: string, action: string): boolean {
  if (ruleAction === action) {
    return true;
  }

  if (ruleAction.endsWith("*")) {
    const prefix = ruleAction.slice(0, -1);
    return action.startsWith(prefix);
  }

  return false;
}

export class PolicyEngine {
  private readonly rules: PolicyRule[];

  constructor(rules: PolicyRule[] = []) {
    this.rules = rules;
  }

  can(action: string): boolean {
    const matched = this.rules.filter((rule) => matchesRule(rule.action, action));

    if (matched.length === 0) {
      return true;
    }

    const denied = matched.some((rule) => rule.effect === "deny");
    if (denied) {
      return false;
    }

    return matched.some((rule) => rule.effect === "allow");
  }

  assert(action: string): void {
    if (!this.can(action)) {
      throw new Error(`Policy denied action '${action}'.`);
    }
  }
}

export interface BaseToolOptions<TInput, TOutput> {
  inputSchema: ZodType<TInput>;
  name: string;
  outputSchema: ZodType<TOutput>;
  policyEngine?: PolicyEngine;
}

export abstract class BaseTool<TInput, TOutput> {
  protected readonly inputSchema: ZodType<TInput>;
  protected readonly name: string;
  protected readonly outputSchema: ZodType<TOutput>;
  private readonly policyEngine?: PolicyEngine;

  constructor(options: BaseToolOptions<TInput, TOutput>) {
    this.inputSchema = options.inputSchema;
    this.name = options.name;
    this.outputSchema = options.outputSchema;
    if (options.policyEngine !== undefined) {
      this.policyEngine = options.policyEngine;
    }
  }

  async run(input: unknown, context: ToolRuntimeContext): Promise<TOutput> {
    this.policyEngine?.assert(`tool.${this.name}`);
    const parsedInput = this.inputSchema.parse(input);
    const output = await this.execute(parsedInput, context);
    return this.outputSchema.parse(output);
  }

  protected abstract execute(input: TInput, context: ToolRuntimeContext): Promise<TOutput>;
}

export interface DbReadInput {
  params?: unknown[] | undefined;
  query: string;
}

export class DbReadTool extends BaseTool<DbReadInput, unknown[]> {
  private readonly executor: (input: DbReadInput & { tenantId: string }) => Promise<unknown[]>;

  constructor(options: {
    executor: (input: DbReadInput & { tenantId: string }) => Promise<unknown[]>;
    policyEngine?: PolicyEngine;
  }) {
    super({
      inputSchema: z.object({
        params: z.array(z.unknown()).optional(),
        query: z.string().min(1)
      }),
      name: "db-read",
      outputSchema: z.array(z.unknown()),
      ...(options.policyEngine !== undefined ? { policyEngine: options.policyEngine } : {})
    });

    this.executor = options.executor;
  }

  protected async execute(input: DbReadInput, context: ToolRuntimeContext): Promise<unknown[]> {
    return this.executor({ ...input, tenantId: context.tenantId });
  }
}

export interface DbWriteInput {
  data: Record<string, unknown>;
  operation: "DELETE" | "INSERT" | "UPDATE";
  table: string;
  where: Record<string, unknown>;
}

export class DbWriteTool extends BaseTool<DbWriteInput, number> {
  private readonly auditPublisher?: (event: Record<string, unknown>) => Promise<void>;
  private readonly executor: (input: DbWriteInput & { tenantId: string }) => Promise<number>;

  constructor(options: {
    auditPublisher?: (event: Record<string, unknown>) => Promise<void>;
    executor: (input: DbWriteInput & { tenantId: string }) => Promise<number>;
    policyEngine?: PolicyEngine;
  }) {
    super({
      inputSchema: z.object({
        data: z.record(z.string(), z.unknown()),
        operation: z.enum(["INSERT", "UPDATE", "DELETE"]),
        table: z.string().min(1),
        where: z.record(z.string(), z.unknown())
      }),
      name: "db-write",
      outputSchema: z.number(),
      ...(options.policyEngine !== undefined ? { policyEngine: options.policyEngine } : {})
    });

    if (options.auditPublisher !== undefined) {
      this.auditPublisher = options.auditPublisher;
    }
    this.executor = options.executor;
  }

  protected async execute(input: DbWriteInput, context: ToolRuntimeContext): Promise<number> {
    await this.auditPublisher?.({
      action: input.operation,
      table: input.table,
      tenantId: context.tenantId,
      traceId: context.traceId
    });

    return this.executor({ ...input, tenantId: context.tenantId });
  }
}

export interface HttpInput {
  body?: unknown | undefined;
  headers?: Record<string, string> | undefined;
  method?: "DELETE" | "GET" | "PATCH" | "POST" | "PUT" | undefined;
  url: string;
}

export class HttpTool extends BaseTool<HttpInput, { body: unknown; status: number }> {
  constructor(options?: { policyEngine?: PolicyEngine }) {
    super({
      inputSchema: z.object({
        body: z.unknown().optional(),
        headers: z.record(z.string(), z.string()).optional(),
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
        url: z.string().url()
      }),
      name: "http",
      outputSchema: z.object({
        body: z.unknown(),
        status: z.number()
      }),
      ...(options?.policyEngine !== undefined ? { policyEngine: options.policyEngine } : {})
    });
  }

  protected async execute(input: HttpInput): Promise<{ body: unknown; status: number }> {
    if (input.url.includes("example.invalid")) {
      throw new Error("HTTP target is unreachable.");
    }

    return {
      body: {
        ok: true,
        url: input.url
      },
      status: 200
    };
  }
}

export interface SendEmailInput {
  body: string;
  subject: string;
  to: string;
}

export class SendEmailTool extends BaseTool<SendEmailInput, { queued: boolean; to: string }> {
  constructor(options?: { policyEngine?: PolicyEngine }) {
    super({
      inputSchema: z.object({
        body: z.string().min(1),
        subject: z.string().min(1),
        to: z.string().email()
      }),
      name: "send-email",
      outputSchema: z.object({
        queued: z.boolean(),
        to: z.string()
      }),
      ...(options?.policyEngine !== undefined ? { policyEngine: options.policyEngine } : {})
    });
  }

  protected async execute(input: SendEmailInput): Promise<{ queued: boolean; to: string }> {
    return {
      queued: true,
      to: input.to
    };
  }
}

export function redactPII<T>(input: T, sensitiveFields: string[] = []): T {
  const sensitive = new Set(sensitiveFields.map((field) => field.toLowerCase()));

  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map((item) => visit(item));
    }

    if (value && typeof value === "object") {
      const redacted: Record<string, unknown> = {};

      for (const [key, childValue] of Object.entries(value as Record<string, unknown>)) {
        if (sensitive.has(key.toLowerCase())) {
          redacted[key] = "***";
        } else {
          redacted[key] = visit(childValue);
        }
      }

      return redacted;
    }

    return value;
  };

  return visit(input) as T;
}
