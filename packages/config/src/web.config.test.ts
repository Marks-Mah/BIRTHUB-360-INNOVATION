import assert from "node:assert/strict";
import test from "node:test";

import { getWebConfig } from "./web.config.js";
import { EnvValidationError } from "./shared.js";

void test("web config requires production telemetry endpoints", () => {
  assert.throws(
    () =>
      getWebConfig({
        NEXT_PUBLIC_API_URL: "https://api.birthhub360.com",
        NEXT_PUBLIC_APP_URL: "https://app.birthhub360.com",
        NEXT_PUBLIC_CSP_REPORT_ONLY: "false",
        NEXT_PUBLIC_ENVIRONMENT: "production"
      }),
    (error: unknown) => {
      assert.ok(error instanceof EnvValidationError);
      assert.match(error.message, /NEXT_PUBLIC_SENTRY_DSN must be configured in production/i);
      return true;
    }
  );
});

void test("web config rejects placeholder auth secrets in production", () => {
  assert.throws(
    () =>
      getWebConfig({
        NEXTAUTH_SECRET: "replace-me-in-production",
        NEXT_PUBLIC_API_URL: "https://api.birthhub360.com",
        NEXT_PUBLIC_APP_URL: "https://app.birthhub360.com",
        NEXT_PUBLIC_CSP_REPORT_ONLY: "false",
        NEXT_PUBLIC_ENVIRONMENT: "production",
        NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/123456"
      }),
    (error: unknown) => {
      assert.ok(error instanceof EnvValidationError);
      assert.match(error.message, /NEXTAUTH_SECRET cannot use placeholder values in production/i);
      return true;
    }
  );
});

void test("web config accepts hardened production settings", () => {
  const config = getWebConfig({
    NEXTAUTH_SECRET: "prod-nextauth-secret-123",
    NEXT_PUBLIC_API_URL: "https://api.birthhub360.com",
    NEXT_PUBLIC_APP_URL: "https://app.birthhub360.com",
    NEXT_PUBLIC_CSP_REPORT_ONLY: "false",
    NEXT_PUBLIC_ENVIRONMENT: "production",
    NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/123456"
  });

  assert.equal(config.NEXT_PUBLIC_ENVIRONMENT, "production");
  assert.equal(config.NEXTAUTH_SECRET, "prod-nextauth-secret-123");
});

void test("web config accepts staging label with production-grade guardrails", () => {
  const config = getWebConfig({
    NEXTAUTH_SECRET: "staging-nextauth-secret-123",
    NEXT_PUBLIC_API_URL: "https://staging-api.birthhub360.com",
    NEXT_PUBLIC_APP_URL: "https://staging.birthhub360.com",
    NEXT_PUBLIC_CSP_REPORT_ONLY: "false",
    NEXT_PUBLIC_ENVIRONMENT: "staging",
    NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/123456"
  });

  assert.equal(config.NEXT_PUBLIC_ENVIRONMENT, "staging");
});
