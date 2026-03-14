import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { webhookSignatureMiddleware } from "../webhook-signature.js";
import jwt from "jsonwebtoken";

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

test("webhookSignatureMiddleware retorna 503 sem secret configurado", () => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  const middleware = webhookSignatureMiddleware({
    provider: "stripe",
    secretEnvVar: "STRIPE_WEBHOOK_SECRET",
    signatureHeader: "stripe-signature",
  });

  const req = { body: { hello: "world" }, header() { return undefined; } };
  const res = createMockRes();

  middleware(req as any, res as any, () => undefined);
  assert.equal(res.state.statusCode, 503);
});

test("webhookSignatureMiddleware valida assinatura hmac", () => {
  process.env.STRIPE_WEBHOOK_SECRET = "secret_test";
  const middleware = webhookSignatureMiddleware({
    provider: "stripe",
    secretEnvVar: "STRIPE_WEBHOOK_SECRET",
    signatureHeader: "stripe-signature",
  });

  const body = { id: "evt_1", type: "invoice.paid" };
  const signature = createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest("hex");

  const req = {
    body,
    header(name: string) {
      if (name === "stripe-signature") return `v1=${signature}`;
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


test("webhookSignatureMiddleware valida assinatura jwt", () => {
  process.env.DOCUSIGN_WEBHOOK_SECRET = "jwt-secret";
  const token = jwt.sign({ sub: "evt_1" }, process.env.DOCUSIGN_WEBHOOK_SECRET);

  const middleware = webhookSignatureMiddleware({
    provider: "docusign",
    secretEnvVar: "DOCUSIGN_WEBHOOK_SECRET",
    signatureHeader: "authorization",
    mode: "jwt",
  });

  const req = {
    body: { event: "contract.signed" },
    header(name: string) {
      if (name === "authorization") return token;
      return undefined;
    },
  };

  const res = createMockRes();
  let nextCalled = false;

  middleware(req as any, res as any, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});
