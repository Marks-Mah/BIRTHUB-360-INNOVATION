import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";

const REQUEST_ID_HEADER = "x-request-id";
const TRACE_ID_HEADER = "x-trace-id";
const JOB_ID_HEADER = "x-job-id";

export interface CorrelationIds {
  requestId: string;
  traceId: string;
  jobId?: string;
}

export function buildCorrelationIds(req: Request): CorrelationIds {
  const requestId = req.header(REQUEST_ID_HEADER) ?? randomUUID();
  const traceId = req.header(TRACE_ID_HEADER) ?? requestId;
  const jobId = req.header(JOB_ID_HEADER) ?? undefined;

  return { requestId, traceId, jobId };
}

export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const correlation = buildCorrelationIds(req);

  res.locals.correlation = correlation;

  res.setHeader(REQUEST_ID_HEADER, correlation.requestId);
  res.setHeader(TRACE_ID_HEADER, correlation.traceId);
  if (correlation.jobId) {
    res.setHeader(JOB_ID_HEADER, correlation.jobId);
  }

  next();
}
