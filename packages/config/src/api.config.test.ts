import assert from "node:assert/strict";
import test from "node:test";

import { getApiConfig } from "./api.config.js";
import { EnvValidationError } from "./shared.js";

const baseEnv = {
  API_CORS_ORIGINS: "https://app.birthhub360.com",
  DATABASE_URL:
    "postgresql://postgres:postgrespassword@db.birthhub360.com:5432/birthub_cycle1?sslmode=require",
  NODE_ENV: "production",
  REDIS_URL: "rediss://cache.birthhub360.com:6379",
  REQUIRE_SECURE_COOKIES: "true",
  STRIPE_CANCEL_URL: "https://app.birthhub360.com/billing/cancel",
  STRIPE_PORTAL_RETURN_URL: "https://app.birthhub360.com/settings/billing",
  STRIPE_SUCCESS_URL: "https://app.birthhub360.com/billing/success",
  WEB_BASE_URL: "https://app.birthhub360.com"
} satisfies NodeJS.ProcessEnv;

void test("api config blocks placeholder production secrets and missing telemetry", () => {
  assert.throws(
    () =>
      getApiConfig({
        ...baseEnv,
        AUTH_MFA_ENCRYPTION_KEY: "replace-me-in-production",
        JOB_HMAC_GLOBAL_SECRET: "replace-me-in-production",
        SESSION_SECRET: "replace-me-in-production",
        STRIPE_SECRET_KEY: "sk_test_replace",
        STRIPE_WEBHOOK_SECRET: "whsec_replace"
      }),
    (error: unknown) => {
      assert.ok(error instanceof EnvValidationError);
      assert.match(error.message, /Production secrets cannot use development defaults/i);
      assert.match(error.message, /STRIPE_SECRET_KEY must be a live production key/i);
      assert.match(error.message, /STRIPE_WEBHOOK_SECRET cannot use placeholder values/i);
      assert.match(error.message, /SENTRY_DSN must be configured in production/i);
      return true;
    }
  );
});

void test("api config accepts hardened staging settings with Stripe test credentials", () => {
  const config = getApiConfig({
    ...baseEnv,
    AUTH_MFA_ENCRYPTION_KEY: "staging-mfa-encryption-key-123",
    DEPLOYMENT_ENVIRONMENT: "staging",
    JOB_HMAC_GLOBAL_SECRET: "staging-job-hmac-secret-123",
    SENTRY_DSN: "https://public@example.ingest.sentry.io/123456",
    SESSION_SECRET: "staging-session-secret-123",
    STRIPE_SECRET_KEY: "sk_test_birthhub360_staging",
    STRIPE_WEBHOOK_SECRET: "whsec_staging_birthhub360",
    WEB_BASE_URL: "https://staging.birthhub360.com"
  });

  assert.equal(config.NODE_ENV, "production");
  assert.equal(config.STRIPE_SECRET_KEY, "sk_test_birthhub360_staging");
  assert.equal(config.STRIPE_WEBHOOK_TOLERANCE_SECONDS, 300);
});

void test("api config accepts hardened production settings", () => {
  const config = getApiConfig({
    ...baseEnv,
    AUTH_MFA_ENCRYPTION_KEY: "prod-mfa-encryption-key-123",
    JOB_HMAC_GLOBAL_SECRET: "prod-job-hmac-secret-123",
    SENTRY_DSN: "https://public@example.ingest.sentry.io/123456",
    SESSION_SECRET: "prod-session-secret-123",
    STRIPE_SECRET_KEY: "sk_live_birthhub360",
    STRIPE_WEBHOOK_SECRET: "whsec_live_birthhub360"
  });

  assert.equal(config.NODE_ENV, "production");
  assert.equal(config.STRIPE_SECRET_KEY, "sk_live_birthhub360");
  assert.equal(config.SENTRY_DSN, "https://public@example.ingest.sentry.io/123456");
  assert.equal(config.STRIPE_WEBHOOK_TOLERANCE_SECONDS, 300);
});
