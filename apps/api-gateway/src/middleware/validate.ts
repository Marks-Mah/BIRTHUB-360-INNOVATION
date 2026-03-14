import type { NextFunction, Request, Response } from "express";

type ParseResult<T> = { success: true; data: T } | { success: false; errors: string[] };

export type Parser<T> = (value: unknown) => ParseResult<T>;

interface ValidationTarget {
  body?: Parser<unknown>;
  query?: Parser<unknown>;
  params?: Parser<unknown>;
}

function fail(res: Response, message: string, errors: string[]) {
  return res.status(400).json({
    code: "VALIDATION_ERROR",
    message,
    details: { errors },
  });
}

export function validateSchema(target: ValidationTarget) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (target.body) {
      const parsed = target.body(req.body);
      if (!parsed.success) {
        return fail(res, "Invalid request body", parsed.errors);
      }
      req.body = parsed.data;
    }

    if (target.query) {
      const parsed = target.query(req.query);
      if (!parsed.success) {
        return fail(res, "Invalid request query", parsed.errors);
      }
      req.query = parsed.data as Request["query"];
    }

    if (target.params) {
      const parsed = target.params(req.params);
      if (!parsed.success) {
        return fail(res, "Invalid request params", parsed.errors);
      }
      req.params = parsed.data as Request["params"];
    }

    return next();
  };
}
