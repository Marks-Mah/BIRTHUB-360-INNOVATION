import assert from "node:assert/strict";
import test from "node:test";
import { createWebhookIdempotencyMiddleware } from "../webhook-idempotency.js";

function createMockRes() {
  const state: { statusCode?: number; payload?: unknown } = {};
  return {
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      state.payload = payload;
      return this;
    },
    state,
  };
}

test("webhookIdempotency aceita primeira ocorrência da chave", () => {
  const middleware = createWebhookIdempotencyMiddleware();
  const req = {
    header(name: string) {
      if (name === "x-idempotency-key") return "evt-1";
      return undefined;
    },
  };
  const res = createMockRes();
  let nextCalled = false;

  middleware(req as any, res as any, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.state.statusCode, undefined);
});

test("webhookIdempotency bloqueia chave duplicada dentro do TTL", () => {
  const middleware = createWebhookIdempotencyMiddleware();
  const req = {
    header(name: string) {
      if (name === "x-idempotency-key") return "evt-dup";
      return undefined;
    },
  };

  const firstRes = createMockRes();
  middleware(req as any, firstRes as any, () => undefined);

  const duplicateRes = createMockRes();
  let nextCalled = false;
  middleware(req as any, duplicateRes as any, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(duplicateRes.state.statusCode, 409);
});

test("webhookIdempotency permite reutilizar chave após expiração", () => {
  let now = 1_000;
  const middleware = createWebhookIdempotencyMiddleware({ ttlMs: 10, getNow: () => now });
  const req = {
    header(name: string) {
      if (name === "x-idempotency-key") return "evt-expire";
      return undefined;
    },
  };

  middleware(req as any, createMockRes() as any, () => undefined);
  now = 1_020;

  let nextCalled = false;
  middleware(req as any, createMockRes() as any, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});
