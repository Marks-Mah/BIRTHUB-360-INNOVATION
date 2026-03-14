import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const asyncHandler =
  <T extends Request>(fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req as T, res, next).catch(next);
  };


export function errorResponse(status: number, code: string, message: string, details?: Record<string, unknown>) {
  return {
    status,
    body: {
      error: { code, message, details },
    },
  };
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const traceId = typeof req.header === "function" ? req.header("x-trace-id") ?? undefined : undefined;
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: { ...(err.details ?? {}), ...(traceId ? { traceId } : {}) },
      },
    });
  }

  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Unexpected internal error",
      details: traceId ? { traceId } : undefined,
    },
  });
}
