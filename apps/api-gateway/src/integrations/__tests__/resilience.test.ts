import assert from "node:assert/strict";
import test from "node:test";
import { IntegrationError } from "../error-catalog.js";
import { executeWithResilience, resetCircuitBreakers } from "../resilience.js";

test.beforeEach(() => {
  resetCircuitBreakers();
});

test("timeout explícito para chamada externa", async () => {
  await assert.rejects(
    executeWithResilience(
      "provider-timeout",
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return "ok";
      },
      {
        timeoutMs: 5,
        retryAttempts: 1,
        baseBackoffMs: 1,
        circuitBreakerFailures: 2,
        circuitBreakerCooldownMs: 100,
      },
    ),
    (error: unknown) => error instanceof IntegrationError && error.code === "INTEGRATION_RETRY_EXHAUSTED",
  );
});

test("circuit breaker abre após falhas consecutivas", async () => {
  const policy = {
    timeoutMs: 10,
    retryAttempts: 1,
    baseBackoffMs: 1,
    circuitBreakerFailures: 1,
    circuitBreakerCooldownMs: 1_000,
  };

  await assert.rejects(
    executeWithResilience("provider-breaker", async () => {
      throw new Error("boom");
    }, policy),
  );

  await assert.rejects(
    executeWithResilience("provider-breaker", async () => "ok", policy),
    (error: unknown) => error instanceof IntegrationError && error.code === "INTEGRATION_CIRCUIT_OPEN",
  );
});
