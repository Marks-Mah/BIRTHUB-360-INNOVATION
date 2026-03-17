import assert from "node:assert/strict";
import test from "node:test";

import type { ApiConfig } from "@birthub/config";
import { BillingEventStatus, prisma } from "@birthub/database";
import express from "express";
import request from "supertest";
import Stripe from "stripe";

import { errorHandler } from "../src/middleware/error-handler.js";
import { STRIPE_API_VERSION } from "../src/modules/billing/stripe.client.js";
import { createStripeWebhookRouter } from "../src/modules/webhooks/stripe.router.js";
import { createTestApiConfig } from "./test-config.js";

function stubMethod(target: object, key: string, value: unknown): () => void {
  const original = Reflect.get(target, key);
  Reflect.set(target, key, value);
  return () => {
    Reflect.set(target, key, original);
  };
}

function applyUpdateData<T extends Record<string, unknown>>(current: T, data: Record<string, unknown>): T {
  const next = { ...current } as Record<string, unknown>;

  for (const [key, value] of Object.entries(data)) {
    if (
      value &&
      typeof value === "object" &&
      "increment" in value &&
      typeof (value as { increment?: unknown }).increment === "number"
    ) {
      next[key] = (Number(next[key] ?? 0) + Number((value as { increment: number }).increment));
      continue;
    }

    next[key] = value;
  }

  return next as T;
}

function createBillingEventStubs() {
  const events = new Map<string, Record<string, unknown>>();

  return {
    get: (eventId: string) => events.get(eventId) ?? null,
    restores: [
      stubMethod(prisma.billingEvent, "findUnique", async (args: { where?: { stripeEventId?: string } }) => {
        const eventId = args.where?.stripeEventId ?? "";
        return events.get(eventId) ?? null;
      }),
      stubMethod(prisma.billingEvent, "create", async (args: { data?: Record<string, unknown> }) => {
        const eventId = String(args.data?.stripeEventId ?? "evt_unknown");
        const record = {
          attemptCount: 0,
          id: "billing_event_1",
          status: BillingEventStatus.received,
          ...args.data
        };
        events.set(eventId, record);
        return record;
      }),
      stubMethod(
        prisma.billingEvent,
        "update",
        async (args: { data?: Record<string, unknown>; where?: { stripeEventId?: string } }) => {
          const eventId = args.where?.stripeEventId ?? "";
          const current = (events.get(eventId) ?? {
            attemptCount: 0,
            id: "billing_event_1",
            stripeEventId: eventId
          }) as Record<string, unknown>;
          const next = applyUpdateData(current, args.data ?? {});
          events.set(eventId, next);
          return next;
        }
      ),
      stubMethod(
        prisma,
        "$transaction",
        async <T>(callback: (tx: typeof prisma) => Promise<T>): Promise<T> => callback(prisma)
      )
    ]
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

void test("stripe webhook accepts valid signature and records billing event state", async () => {
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
  const billingEvents = createBillingEventStubs();

  try {
    const app = createWebhookApp(config);
    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", signature)
      .set("content-type", "application/json")
      .send(payload)
      .expect(200);

    assert.equal(response.body.received, true);
    assert.equal(
      billingEvents.get("evt_valid_signature")?.status,
      BillingEventStatus.processed
    );
    assert.equal(
      billingEvents.get("evt_valid_signature")?.attemptCount,
      1
    );
  } finally {
    for (const restore of billingEvents.restores.reverse()) {
      restore();
    }
  }
});
