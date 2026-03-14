export class PrismaQueryTimeoutError extends Error {
  public readonly model: string | undefined;
  public readonly operation: string;
  public readonly timeoutMs: number;

  constructor(operation: string, timeoutMs: number, model?: string) {
    super(
      `Database operation '${model ? `${model}.` : ""}${operation}' exceeded the ${timeoutMs}ms timeout.`
    );
    this.name = "PrismaQueryTimeoutError";
    this.model = model;
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }
}
