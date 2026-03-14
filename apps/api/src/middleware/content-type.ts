import type { NextFunction, Request, Response } from "express";

import { ProblemDetailsError } from "../lib/problem-details.js";

const mutationMethods = new Set(["PATCH", "POST", "PUT"]);

function hasRequestBody(request: Request): boolean {
  const contentLength = request.header("content-length");

  if (contentLength && Number(contentLength) > 0) {
    return true;
  }

  return Boolean(request.header("transfer-encoding"));
}

export function contentTypeMiddleware(
  request: Request,
  _response: Response,
  next: NextFunction
): void {
  if (!mutationMethods.has(request.method)) {
    next();
    return;
  }

  if (!hasRequestBody(request)) {
    next();
    return;
  }

  if (request.is("application/json")) {
    next();
    return;
  }

  next(
    new ProblemDetailsError({
      detail: "This endpoint only accepts 'application/json' payloads.",
      status: 415,
      title: "Unsupported Media Type"
    })
  );
}
