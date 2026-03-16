import { cpus } from "node:os";

import { z } from "zod";

import {
  EnvValidationError,
  hasPlaceholderMarker,
  hasRequiredPostgresSsl,
  hasRequiredRedisTls,
  nodeEnvSchema,
  nonEmptyString,
  optionalNonEmptyString,
  optionalUrlString,
  parseEnv,
  urlString
} from "./shared.js";

export const workerEnvSchema = z.object({
  AGENT_CIRCUIT_BREAKER_COOLDOWN_MS: z.coerce.number().int().positive().default(60_000),
  AGENT_CIRCUIT_BREAKER_FAILURES: z.coerce.number().int().positive().default(3),
  AGENT_DEFAULT_TOOL_COST_BRL: z.coerce.number().nonnegative().default(0.37),
  AGENT_EXECUTION_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  AGENT_MAX_COST_BRL: z.coerce.number().positive().default(20),
  AGENT_MAX_PLAN_STEPS: z.coerce.number().int().positive().default(12),
  AGENT_TOOL_RETRY_ATTEMPTS: z.coerce.number().int().positive().default(5),
  BILLING_EXPORT_LOCAL_DIR: nonEmptyString.default("artifacts/billing-exports"),
  BILLING_EXPORT_S3_BUCKET: optionalNonEmptyString,
  BILLING_EXPORT_S3_ENDPOINT: optionalUrlString,
  BILLING_EXPORT_S3_PREFIX: nonEmptyString.default("daily-invoices"),
  BILLING_EXPORT_S3_REGION: nonEmptyString.default("us-east-1"),
  BILLING_EXPORT_STORAGE_MODE: z.enum(["local", "s3"]).default("local"),
  BILLING_GRACE_PERIOD_DAYS: z.coerce.number().int().min(0).default(3),
  BILLING_STATUS_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  DATABASE_URL: urlString,
  EMAIL_FROM_ADDRESS: nonEmptyString.default("noreply@birthhub.local"),
  HUBSPOT_ACCESS_TOKEN: optionalNonEmptyString,
  HUBSPOT_BASE_URL: urlString.default("https://api.hubapi.com"),
  JOB_HMAC_GLOBAL_SECRET: nonEmptyString.default("dev-job-hmac-secret"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  NODE_ENV: nodeEnvSchema,
  QUEUE_NAME: nonEmptyString.default("birthub-cycle1"),
  REDIS_URL: urlString,
  SENTRY_DSN: optionalUrlString,
  SENDGRID_API_KEY: optionalNonEmptyString,
  TENANT_QUEUE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  TENANT_QUEUE_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  WEBHOOK_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  WEB_BASE_URL: urlString.default("http://localhost:3001"),
  WORKER_HEALTH_PORT: z.coerce.number().int().positive().default(3002),
  WORKER_CONCURRENCY: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.coerce.number().int().positive().optional()
  )
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

    if (
      parsed.JOB_HMAC_GLOBAL_SECRET === "dev-job-hmac-secret" ||
      hasPlaceholderMarker(parsed.JOB_HMAC_GLOBAL_SECRET)
    ) {
      issues.push("JOB_HMAC_GLOBAL_SECRET cannot use the development default in production.");
    }

    if (!parsed.SENTRY_DSN) {
      issues.push("SENTRY_DSN must be configured in production.");
    }

    if (parsed.BILLING_EXPORT_STORAGE_MODE === "s3" && !parsed.BILLING_EXPORT_S3_BUCKET) {
      issues.push("BILLING_EXPORT_S3_BUCKET must be set when BILLING_EXPORT_STORAGE_MODE=s3.");
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
