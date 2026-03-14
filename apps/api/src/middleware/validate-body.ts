import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

import { fromZodError } from "../lib/problem-details.js";

export function validateBody<TSchema extends ZodTypeAny>(schema: TSchema) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(request.body);

    if (!parsed.success) {
      next(fromZodError(parsed.error));
      return;
    }

    request.body = parsed.data;
    next();
  };
}
