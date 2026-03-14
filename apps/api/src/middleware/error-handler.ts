import type { NextFunction, Request, Response } from "express";

import { ProblemDetailsError, toProblemDetails } from "../lib/problem-details.js";
import { captureApiException } from "../observability/sentry.js";

export function notFoundMiddleware(request: Request, _response: Response, next: NextFunction): void {
  next(
    new ProblemDetailsError({
      detail: `No route matched '${request.originalUrl}'.`,
      status: 404,
      title: "Not Found"
    })
  );
}

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction
): void {
  if (error instanceof ProblemDetailsError) {
    response.status(error.status).json(toProblemDetails(request, error));
    return;
  }

  captureApiException(error, request);

  const fallback = new ProblemDetailsError({
    detail: error instanceof Error ? error.message : "Unexpected internal server error.",
    status: 500,
    title: "Internal Server Error"
  });

  response.status(fallback.status).json(toProblemDetails(request, fallback));
}
