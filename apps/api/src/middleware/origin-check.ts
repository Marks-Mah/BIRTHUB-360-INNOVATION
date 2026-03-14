import type { NextFunction, Request, Response } from "express";

import { ProblemDetailsError } from "../lib/problem-details.js";

const mutationMethods = new Set(["PATCH", "POST", "PUT", "DELETE"]);

function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
}

export function originValidationMiddleware(allowedOrigins: string[]) {
  const normalizedAllowedOrigins = new Set(allowedOrigins.map((origin) => normalizeOrigin(origin)));

  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!mutationMethods.has(request.method)) {
      next();
      return;
    }

    if (request.context.authType === "api-key") {
      next();
      return;
    }

    const originHeader = request.header("origin");
    const refererHeader = request.header("referer");
    const origin = originHeader ? normalizeOrigin(originHeader) : null;
    const referer = refererHeader ? normalizeOrigin(refererHeader) : null;

    if (!origin && !referer) {
      next();
      return;
    }

    if (origin && normalizedAllowedOrigins.has(origin)) {
      next();
      return;
    }

    if (!origin && referer && normalizedAllowedOrigins.has(referer)) {
      next();
      return;
    }

    next(
      new ProblemDetailsError({
        detail: "Origin validation failed for this mutation endpoint.",
        status: 403,
        title: "Forbidden"
      })
    );
  };
}
