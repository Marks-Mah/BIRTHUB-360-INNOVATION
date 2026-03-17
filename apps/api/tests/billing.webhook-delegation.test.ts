import assert from "node:assert/strict";
import test from "node:test";

import type { ApiConfig } from "@birthub/config";
import { prisma } from "@birthub/database";
import express from "express";
import request from "supertest";
import Stripe from "stripe";

import { errorHandler } from "../src/middleware/error-handler.js";
import { STRIPE_API_VERSION } from "../src/modules/billing/stripe.client.js";
import {
  createStripeWebhookRouter,
  type StripeWebhookRouterDependencies
} from "../src/modules/webhooks/stripe.router.js";
import { createTestApiConfig } from "./test-config.js";

function stubMethod(target: object, key: string, value: unknown): () => void {
  const original = Reflect.get(target, key);
  Reflect.set(target, key, value);
  return () => {
    Reflect.set(target, key, original);
  };
}

function createWebhookApp(
  config: ApiConfig,
  dependencies?: StripeWebhookRouterDependencies
) {
  const app = express();
  app.use("/api/webhooks", createStripeWebhookRouter(config, dependencies));
  app.use(errorHandler);
  return app;
}

void test("stripe webhook delegates domain processing to the canonical billing service", async () => {
  const config = createTestApiConfig();
  const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION
  });
  const payload = JSON.stringify({
    data: {
      object: {
        id: "pi_delegate"
      }
    },
    id: "evt_delegate_signature",
    object: "event",
    type: "payment_intent.created"
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: config.STRIPE_WEBHOOK_SECRET
  });
  const delegatedEvents: string[] = [];
  const restores = [
    stubMethod(prisma.billingEvent, "findUnique", async () => null),
    stubMethod(prisma.billingEvent, "create", async () => ({
      id: "billing_event_1"
    }))
  ];

  try {
    const app = createWebhookApp(config, {
      processStripeBillingEvent: async ({ event }) => {
        delegatedEvents.push(event.id);
        return {};
      }
    });
    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", signature)
      .set("content-type", "application/json")
      .send(payload)
      .expect(200);

    assert.equal(response.body.received, true);
    assert.deepEqual(delegatedEvents, ["evt_delegate_signature"]);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});
