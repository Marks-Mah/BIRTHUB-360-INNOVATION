import { z } from "zod";

import {
  commaSeparatedList,
  EnvValidationError,
  hasRequiredPostgresSsl,
  hasRequiredRedisTls,
  isLocalUrl,
  isSecureHttpUrl,
  nodeEnvSchema,
  nonEmptyString,
  optionalNonEmptyString,
  optionalUrlString,
  parseEnv,
  urlString
} from "./shared.js";

export const apiEnvSchema = z.object({
  API_AUTH_COOKIE_NAME: nonEmptyString.default("bh360_session"),
  API_AUTH_REFRESH_COOKIE_NAME: nonEmptyString.default("bh360_refresh"),
  API_AUTH_ROTATION_GRACE_HOURS: z.coerce.number().int().positive().default(24),
  API_AUTH_SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24),
  API_AUTH_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  AUTH_BCRYPT_SALT_ROUNDS: z.coerce.number().int().positive().default(12),
  API_CORS_ORIGINS: z.string().default("http://localhost:3001"),
  API_CSRF_COOKIE_NAME: nonEmptyString.default("bh360_csrf"),
  API_CSRF_HEADER_NAME: nonEmptyString.default("x-csrf-token"),
  API_HANDLER_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  API_JSON_BODY_LIMIT: nonEmptyString.default("5mb"),
  API_KEY_PREFIX: nonEmptyString.default("bh360_live"),
  API_KEY_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(600),
  API_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  API_LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  API_PORT: z.coerce.number().int().positive().default(3000),
  API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  API_WEBHOOK_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  API_WEBHOOK_RATE_LIMIT_TENANT_MULTIPLIER: z.coerce.number().int().positive().default(2),
  API_WEBHOOK_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  AUTH_MFA_CHALLENGE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  AUTH_MFA_CLOCK_SKEW_WINDOWS: z.coerce.number().int().positive().default(1),
  AUTH_MFA_ENCRYPTION_KEY: nonEmptyString.default("dev-mfa-encryption-key"),
  AUTH_MFA_ISSUER: nonEmptyString.default("BirthHub360"),
  BILLING_GRACE_PERIOD_DAYS: z.coerce.number().int().min(0).default(3),
  DATABASE_URL: urlString,
  EXTERNAL_HEALTHCHECK_URLS: z.string().default(""),
  JOB_HMAC_GLOBAL_SECRET: nonEmptyString.default("dev-job-hmac-secret"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  NODE_ENV: nodeEnvSchema,
  REQUIRE_SECURE_COOKIES: z.coerce.boolean().default(false),
  OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrlString,
  OTEL_SERVICE_NAME: nonEmptyString.default("birthub-api"),
  QUEUE_BACKPRESSURE_THRESHOLD: z.coerce.number().int().positive().default(10_000),
  QUEUE_NAME: nonEmptyString.default("birthub-cycle1"),
  REDIS_URL: urlString,
  TENANT_QUEUE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  TENANT_QUEUE_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  SENTRY_DSN: optionalUrlString,
  SENTRY_ENVIRONMENT: optionalNonEmptyString,
  SESSION_SECRET: nonEmptyString.default("dev-session-secret"),
  STRIPE_CANCEL_URL: urlString.default("http://localhost:3001/billing/cancel"),
  STRIPE_DECLINE_BAN_THRESHOLD: z.coerce.number().int().positive().default(5),
  STRIPE_PORTAL_RETURN_URL: urlString.default("http://localhost:3001/settings/billing"),
  STRIPE_SECRET_KEY: nonEmptyString.default("sk_test_birthub360"),
  STRIPE_SUCCESS_URL: urlString.default("http://localhost:3001/billing/success"),
  STRIPE_TEMP_BAN_SECONDS: z.coerce.number().int().positive().default(15 * 60),
  STRIPE_WEBHOOK_SECRET: nonEmptyString.default("whsec_birthub360"),
  UPTIMEROBOT_API_TOKEN: optionalNonEmptyString,
  WEB_BASE_URL: urlString.default("http://localhost:3001")
});

export type ApiConfig = z.infer<typeof apiEnvSchema> & {
  corsOrigins: string[];
  externalHealthcheckUrls: string[];
};

export function getApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const parsed = parseEnv("api", apiEnvSchema, env);
  const corsOrigins = commaSeparatedList.parse(parsed.API_CORS_ORIGINS);
  const externalHealthcheckUrls = commaSeparatedList.parse(parsed.EXTERNAL_HEALTHCHECK_URLS);

  if (parsed.NODE_ENV === "production") {
    const issues: string[] = [];

    if (parsed.AUTH_BCRYPT_SALT_ROUNDS < 12) {
      issues.push("AUTH_BCRYPT_SALT_ROUNDS must be >= 12 in production.");
    }

    if (!hasRequiredPostgresSsl(parsed.DATABASE_URL)) {
      issues.push("DATABASE_URL must include sslmode=require (or stronger) in production.");
    }

    if (!hasRequiredRedisTls(parsed.REDIS_URL)) {
      issues.push("REDIS_URL must use TLS in production (rediss:// or tls=true).");
    }

    if (!parsed.REQUIRE_SECURE_COOKIES) {
      issues.push("REQUIRE_SECURE_COOKIES must be true in production.");
    }

    if (
      parsed.SESSION_SECRET === "dev-session-secret" ||
      parsed.JOB_HMAC_GLOBAL_SECRET === "dev-job-hmac-secret" ||
      parsed.AUTH_MFA_ENCRYPTION_KEY === "dev-mfa-encryption-key"
    ) {
      issues.push("Production secrets cannot use development defaults.");
    }

    if (!isSecureHttpUrl(parsed.WEB_BASE_URL) || isLocalUrl(parsed.WEB_BASE_URL)) {
      issues.push("WEB_BASE_URL must use the public HTTPS domain in production.");
    }

    if (!isSecureHttpUrl(parsed.STRIPE_SUCCESS_URL) || !isSecureHttpUrl(parsed.STRIPE_CANCEL_URL)) {
      issues.push("Stripe return URLs must use HTTPS in production.");
    }

    if (
      corsOrigins.length === 0 ||
      corsOrigins.some(
        (origin) =>
          origin === "*" || origin.includes("localhost") || origin.includes("127.0.0.1")
      )
    ) {
      issues.push("API_CORS_ORIGINS must only contain approved production origins.");
    }

    if (issues.length > 0) {
      throw new EnvValidationError("api", issues);
    }
  }

  return {
    ...parsed,
    corsOrigins,
    externalHealthcheckUrls,
    SENTRY_ENVIRONMENT: parsed.SENTRY_ENVIRONMENT ?? parsed.NODE_ENV
  };
}
