import { createHash } from "node:crypto";

import { z } from "zod";

import { BaseTool, type BaseToolOptions, type ToolExecutionContext } from "./baseTool.js";

const dbWriteInputSchema = z
  .object({
    data: z.record(z.string(), z.unknown()),
    operation: z.enum(["DELETE", "INSERT", "UPDATE", "UPSERT"]),
    table: z.string().min(1),
    where: z.record(z.string(), z.unknown()).default({})
  })
  .strict();

const dbWriteOutputSchema = z
  .object({
    affectedRows: z.number().int().nonnegative()
  })
  .strict();

export type DbWriteInput = z.infer<typeof dbWriteInputSchema>;
export type DbWriteOutput = z.infer<typeof dbWriteOutputSchema>;

export interface DbWriteAuditEvent {
  action: "db-write";
  actorAgentId: string;
  digest: string;
  operation: DbWriteInput["operation"];
  table: string;
  tenantId: string;
}

export type DbWriteAuditPublisher = (event: DbWriteAuditEvent) => Promise<void>;

export type DbWriteExecutor = (input: {
  data: Record<string, unknown>;
  operation: DbWriteInput["operation"];
  table: string;
  tenantId: string;
  where: Record<string, unknown>;
}) => Promise<number>;

export interface DbWriteToolOptions extends BaseToolOptions {
  auditPublisher?: DbWriteAuditPublisher;
  executor?: DbWriteExecutor;
}

export class DbWriteTool extends BaseTool<DbWriteInput, DbWriteOutput> {
  private readonly auditPublisher: DbWriteAuditPublisher | undefined;
  private readonly executor: DbWriteExecutor;

  constructor(options: DbWriteToolOptions = {}) {
    super(
      {
        description: "Database mutation tool with mandatory audit event emission.",
        inputSchema: dbWriteInputSchema,
        name: "db-write",
        outputSchema: dbWriteOutputSchema
      },
      options
    );

    this.auditPublisher = options.auditPublisher;
    this.executor = options.executor ?? (async () => 0);
  }

  protected async execute(input: DbWriteInput, context: ToolExecutionContext): Promise<DbWriteOutput> {
    if (!this.auditPublisher) {
      throw new Error("db-write requires an audit publisher before commit.");
    }

    const payload = {
      data: input.data,
      operation: input.operation,
      table: input.table,
      tenantId: context.tenantId,
      where: input.where
    };

    const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");

    await this.auditPublisher({
      action: "db-write",
      actorAgentId: context.agentId,
      digest,
      operation: input.operation,
      table: input.table,
      tenantId: context.tenantId
    });

    const affectedRows = await this.executor(payload);
    return { affectedRows };
  }
}
