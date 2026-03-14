import { cpus } from "node:os";

import { z } from "zod";

import {
  EnvValidationError,
  hasRequiredPostgresSsl,
  hasRequiredRedisTls,
  nodeEnvSchema,
  nonEmptyString,
  optionalUrlString,
  parseEnv,
  urlString
} from "./shared.js";

export const workerEnvSchema = z.object({
  BILLING_GRACE_PERIOD_DAYS: z.coerce.number().int().min(0).default(3),
  BILLING_STATUS_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  DATABASE_URL: urlString,
  EMAIL_FROM_ADDRESS: nonEmptyString.default("noreply@birthhub.local"),
  HUBSPOT_ACCESS_TOKEN: nonEmptyString.optional(),
  HUBSPOT_BASE_URL: urlString.default("https://api.hubapi.com"),
  JOB_HMAC_GLOBAL_SECRET: nonEmptyString.default("dev-job-hmac-secret"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  NODE_ENV: nodeEnvSchema,
  QUEUE_NAME: nonEmptyString.default("birthub-cycle1"),
  REDIS_URL: urlString,
  SENTRY_DSN: optionalUrlString,
  SENDGRID_API_KEY: nonEmptyString.optional(),
  TENANT_QUEUE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  TENANT_QUEUE_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  WEBHOOK_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  WEB_BASE_URL: urlString.default("http://localhost:3001"),
  WORKER_HEALTH_PORT: z.coerce.number().int().positive().default(3002),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().optional()
});

export type WorkerConfig = z.infer<typeof workerEnvSchema> & {
  WORKER_CONCURRENCY: number;
};

export function getWorkerConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const parsed = parseEnv("worker", workerEnvSchema, env);
  const resolvedConcurrency = parsed.WORKER_CONCURRENCY ?? Math.max(2, cpus().length);

  if (parsed.NODE_ENV === "production") {
    const issues: string[] = [];

    if (!hasRequiredPostgresSsl(parsed.DATABASE_URL)) {
      issues.push("DATABASE_URL must include sslmode=require (or stronger) in production.");
    }

    if (!hasRequiredRedisTls(parsed.REDIS_URL)) {
      issues.push("REDIS_URL must use TLS in production (rediss:// or tls=true).");
    }

    if (parsed.JOB_HMAC_GLOBAL_SECRET === "dev-job-hmac-secret") {
      issues.push("JOB_HMAC_GLOBAL_SECRET cannot use the development default in production.");
    }

    if (issues.length > 0) {
      throw new EnvValidationError("worker", issues);
    }
  }

  return {
    ...parsed,
    WORKER_CONCURRENCY: resolvedConcurrency
  };
}
