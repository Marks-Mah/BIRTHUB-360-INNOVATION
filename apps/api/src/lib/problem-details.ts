import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";

export interface ProblemDetails {
  detail: string;
  instance: string;
  status: number;
  title: string;
  type: string;
  errors?: unknown;
}

export class ProblemDetailsError extends Error {
  public readonly detail: string;
  public readonly errors: unknown;
  public readonly status: number;
  public readonly title: string;
  public readonly type: string;

  constructor(input: {
    detail: string;
    errors?: unknown;
    status: number;
    title: string;
    type?: string;
  }) {
    super(input.detail);
    this.name = "ProblemDetailsError";
    this.detail = input.detail;
    this.errors = input.errors;
    this.status = input.status;
    this.title = input.title;
    this.type = input.type ?? "about:blank";
  }
}

export function toProblemDetails(request: Request, error: ProblemDetailsError): ProblemDetails {
  return {
    detail: error.detail,
    errors: error.errors,
    instance: request.originalUrl,
    status: error.status,
    title: error.title,
    type: error.type
  };
}

export function fromZodError(error: ZodError): ProblemDetailsError {
  return new ProblemDetailsError({
    detail: "One or more fields are invalid.",
    errors: error.flatten(),
    status: 400,
    title: "Bad Request",
    type: "https://datatracker.ietf.org/doc/html/rfc7807"
  });
}

export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}
