import assert from "node:assert/strict";
import test from "node:test";
import { IntegrationError } from "../error-catalog.js";
import { createPaymentAdapterFromEnv, MockPaymentAdapter, PaymentService } from "../payment-adapter.js";
import { resetCircuitBreakers } from "../resilience.js";

test.beforeEach(() => {
  resetCircuitBreakers();
});

test.afterEach(() => {
  delete process.env.PAYMENT_PROVIDER;
  delete process.env.ASAAS_API_KEY;
  delete process.env.ASAAS_BASE_URL;
  process.env.NODE_ENV = "test";
});

test("payment service aplica adapter + política resiliente com sucesso", async () => {
  const service = new PaymentService(new MockPaymentAdapter(), {
    timeoutMs: 200,
    retryAttempts: 2,
    baseBackoffMs: 1,
    circuitBreakerFailures: 2,
    circuitBreakerCooldownMs: 1_000,
  });

  const result = await service.reconcilePayment({
    customerId: "cust-1",
    amountCents: 10_500,
    currency: "BRL",
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.provider, "mock-payment");
});

test("createPaymentAdapterFromEnv usa mock em ambiente de teste", () => {
  process.env.NODE_ENV = "test";
  delete process.env.PAYMENT_PROVIDER;
  const adapter = createPaymentAdapterFromEnv();
  assert.equal(adapter.providerName, "mock-payment");
});

test("createPaymentAdapterFromEnv falha quando provider real não possui env obrigatória", () => {
  process.env.NODE_ENV = "production";
  process.env.PAYMENT_PROVIDER = "asaas";
  delete process.env.ASAAS_API_KEY;
  delete process.env.ASAAS_BASE_URL;

  assert.throws(
    () => createPaymentAdapterFromEnv(),
    (error: unknown) => error instanceof IntegrationError && error.code === "INTEGRATION_PROVIDER_ERROR",
  );
});

test("payment service respeita timeout e retorna erro tipado", async () => {
  const slowAdapter = {
    providerName: "slow-provider",
    async charge() {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { provider: "slow-provider", chargeId: "ch_1", status: "succeeded" as const };
    },
  };

  const service = new PaymentService(slowAdapter, {
    timeoutMs: 1,
    retryAttempts: 1,
    baseBackoffMs: 1,
    circuitBreakerFailures: 1,
    circuitBreakerCooldownMs: 50,
  });

  await assert.rejects(
    service.reconcilePayment({ customerId: "cust-2", amountCents: 5_000, currency: "BRL" }),
    (error: unknown) => error instanceof IntegrationError && error.code === "INTEGRATION_RETRY_EXHAUSTED",
  );
});
