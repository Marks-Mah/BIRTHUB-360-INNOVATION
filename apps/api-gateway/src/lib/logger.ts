export interface LoggerLike {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): LoggerLike;
}

class ConsoleLogger implements LoggerLike {
  constructor(private bindings: Record<string, unknown> = {}) {}

  private merge(meta?: Record<string, unknown>) {
    return { ...this.bindings, ...(meta ?? {}) };
  }

  debug(message: string, meta?: Record<string, unknown>) {
    console.debug(message, this.merge(meta));
  }

  info(message: string, meta?: Record<string, unknown>) {
    console.info(message, this.merge(meta));
  }

  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(message, this.merge(meta));
  }

  error(message: string, meta?: Record<string, unknown>) {
    console.error(message, this.merge(meta));
  }

  child(bindings: Record<string, unknown>): LoggerLike {
    return new ConsoleLogger(this.merge(bindings));
  }
}

export const logger: LoggerLike = new ConsoleLogger();
export const createLogger = (bindings: Record<string, unknown> = {}) => logger.child(bindings);