import { IntegrationError } from "./error-catalog.js";

export interface ResiliencePolicy {
  timeoutMs: number;
  retryAttempts: number;
  baseBackoffMs: number;
  circuitBreakerFailures: number;
  circuitBreakerCooldownMs: number;
}

const circuitState = new Map<string, { failures: number; openUntil: number | null }>();

export async function executeWithResilience<T>(
  integrationName: string,
  action: () => Promise<T>,
  policy: ResiliencePolicy,
): Promise<T> {
  const state = circuitState.get(integrationName) ?? { failures: 0, openUntil: null };
  const now = Date.now();

  if (state.openUntil && state.openUntil > now) {
    throw new IntegrationError("INTEGRATION_CIRCUIT_OPEN", `Circuit breaker open for ${integrationName}`, {
      integrationName,
      openUntil: state.openUntil,
    });
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= policy.retryAttempts; attempt += 1) {
    try {
      const result = await Promise.race([
        action(),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new IntegrationError("INTEGRATION_TIMEOUT", `Timeout on ${integrationName}`, { integrationName })),
            policy.timeoutMs,
          );
        }),
      ]);

      circuitState.set(integrationName, { failures: 0, openUntil: null });
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < policy.retryAttempts) {
        await new Promise((resolve) => setTimeout(resolve, policy.baseBackoffMs * attempt));
      }
    }
  }

  const failures = state.failures + 1;
  const openUntil = failures >= policy.circuitBreakerFailures ? now + policy.circuitBreakerCooldownMs : null;
  circuitState.set(integrationName, { failures, openUntil });

  throw new IntegrationError("INTEGRATION_RETRY_EXHAUSTED", `Retry exhausted for ${integrationName}`, {
    integrationName,
    failures,
    lastError: lastError instanceof Error ? lastError.message : String(lastError),
  });
}

export function resetCircuitBreakers() {
  circuitState.clear();
}
