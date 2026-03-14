import type { NextFunction, Request, Response } from "express";

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(/<[^>]+>/g, "").trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)])
    );
  }

  return value;
}

export function sanitizeMutationInput(
  request: Request,
  _response: Response,
  next: NextFunction
): void {
  if (request.body) {
    request.body = sanitizeValue(request.body);
  }

  next();
}
