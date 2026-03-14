import type { NextFunction, Request, Response } from "express";
import { logger, type LoggerLike } from "../lib/logger.js";

export function getCloudLogger(): LoggerLike {
  return logger;
}

export function cloudLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Pass the basic logger down the middleware chain via res.locals if needed,
  // or simply execute next() and use the exported logger inside controllers.
  res.locals.logger = logger.child({
    path: req.path,
    method: req.method,
  });
  next();
}

export { logger };