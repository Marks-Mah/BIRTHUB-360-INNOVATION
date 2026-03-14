import assert from "node:assert/strict";
import test from "node:test";

import type { ApiConfig } from "@birthub/config";
import { prisma } from "@birthub/database";
import express from "express";
import request from "supertest";
import Stripe from "stripe";

import { errorHandler } from "../src/middleware/error-handler.js";
import { createStripeWebhookRouter } from "../src/modules/webhooks/stripe.router.js";
import { STRIPE_API_VERSION } from "../src/modules/billing/stripe.client.js";
import { createTestApiConfig } from "./test-config.js";

function stubMethod(target: any, key: string, value: unknown): () => void {
  const original = target[key];
  target[key] = value;
  return () => {
    target[key] = original;
  };
}

function createWebhookApp(config: ApiConfig) {
  const app = express();
  app.use("/api/webhooks", createStripeWebhookRouter(config));
  app.use(errorHandler);
  return app;
}

void test("stripe webhook rejects invalid signature with 400", async () => {
  const app = createWebhookApp(createTestApiConfig());

  const payload = JSON.stringify({
    data: {
      object: {
        id: "pi_invalid"
      }
    },
    id: "evt_invalid_signature",
    object: "event",
    type: "payment_intent.created"
  });

  await request(app)
    .post("/api/webhooks/stripe")
    .set("stripe-signature", "invalid-signature")
    .set("content-type", "application/json")
    .send(payload)
    .expect(400);
});

void test("stripe webhook accepts valid signature and records billing event", async () => {
  const config = createTestApiConfig();
  const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION
  });
  const payload = JSON.stringify({
    data: {
      object: {
        id: "pi_valid"
      }
    },
    id: "evt_valid_signature",
    object: "event",
    type: "payment_intent.created"
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: config.STRIPE_WEBHOOK_SECRET
  });
  const restores = [
    stubMethod(prisma.billingEvent, "findUnique", async () => null),
    stubMethod(prisma.billingEvent, "create", async () => ({
      id: "billing_event_1"
    }))
  ];

  try {
    const app = createWebhookApp(config);
    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", signature)
      .set("content-type", "application/json")
      .send(payload)
      .expect(200);

    assert.equal(response.body.received, true);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});
