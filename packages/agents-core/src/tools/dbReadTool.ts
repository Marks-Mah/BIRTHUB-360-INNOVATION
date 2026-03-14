import { z } from "zod";

import { BaseTool, type BaseToolOptions, type ToolExecutionContext } from "./baseTool.js";

const dbReadInputSchema = z
  .object({
    params: z.array(z.unknown()).default([]),
    query: z.string().min(1)
  })
  .strict();

const dbReadOutputSchema = z
  .object({
    rowCount: z.number().int().nonnegative(),
    rows: z.array(z.unknown())
  })
  .strict();

export type DbReadInput = z.infer<typeof dbReadInputSchema>;
export type DbReadOutput = z.infer<typeof dbReadOutputSchema>;

export type DbReadExecutor = (input: {
  params: unknown[];
  query: string;
  tenantId: string;
}) => Promise<unknown[]>;

export interface DbReadToolOptions extends BaseToolOptions {
  executor?: DbReadExecutor;
}

function isReadOnlyQuery(query: string): boolean {
  return /^\s*(select|with)\b/i.test(query);
}

export class DbReadTool extends BaseTool<DbReadInput, DbReadOutput> {
  private readonly executor: DbReadExecutor;

  constructor(options: DbReadToolOptions = {}) {
    super(
      {
        description: "Read-only database access with mandatory tenant scoping.",
        inputSchema: dbReadInputSchema,
        name: "db-read",
        outputSchema: dbReadOutputSchema
      },
      options
    );

    this.executor = options.executor ?? (async () => []);
  }

  protected async execute(input: DbReadInput, context: ToolExecutionContext): Promise<DbReadOutput> {
    if (!isReadOnlyQuery(input.query)) {
      throw new Error("db-read only accepts SELECT/WITH statements.");
    }

    const scopedQuery = `${input.query}\n-- tenant_scope: ${context.tenantId}`;
    const rows = await this.executor({
      params: [...input.params, context.tenantId],
      query: scopedQuery,
      tenantId: context.tenantId
    });

    return {
      rowCount: rows.length,
      rows
    };
  }
}
