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
      next[key] = Number(next[key] ?? 0) + Number((value as { increment: number }).increment);
      continue;
    }

    next[key] = value;
  }

  return next as T;
}

function createWebhookApp(config: ApiConfig) {
  const app = express();
  app.use("/api/webhooks", createStripeWebhookRouter(config));
  app.use(errorHandler);
  return app;
}

void test("invoice.payment_succeeded event is idempotent when replayed 3 times", async () => {
  const config = createTestApiConfig();
  const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION
  });
  const billingEvents = new Map<string, Record<string, unknown>>();
  let subscriptionUpdateCalls = 0;
  let invoiceUpsertCalls = 0;
  const payload = JSON.stringify({
    data: {
      object: {
        amount_due: 14900,
        amount_paid: 14900,
        currency: "usd",
        customer: "cus_alpha",
        due_date: null,
        hosted_invoice_url: "https://billing.stripe.com/invoice/test",
        id: "in_test_1",
        invoice_pdf: "https://pay.stripe.com/invoice/test.pdf",
        lines: {
          data: [
            {
              period: {
                end: 1_711_929_600,
                start: 1_709_251_200
              }
            }
          ]
        },
        object: "invoice",
        status: "paid",
        subscription: "sub_stripe_1"
      }
    },
    id: "evt_invoice_paid_1",
    object: "event",
    type: "invoice.payment_succeeded"
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: config.STRIPE_WEBHOOK_SECRET
  });
  const restores = [
    stubMethod(prisma.billingEvent, "findUnique", async (args: { where?: { stripeEventId?: string } }) => {
      const eventId = args.where?.stripeEventId ?? "";
      return billingEvents.get(eventId) ?? null;
    }),
    stubMethod(prisma.billingEvent, "create", async (args: { data?: Record<string, unknown> }) => {
      const eventId = String(args.data?.stripeEventId ?? "evt_unknown");
      const record = {
        attemptCount: 0,
        id: "be_1",
        status: BillingEventStatus.received,
        ...args.data
      };
      billingEvents.set(eventId, record);
      return record;
    }),
    stubMethod(
      prisma.billingEvent,
      "update",
      async (args: { data?: Record<string, unknown>; where?: { stripeEventId?: string } }) => {
        const eventId = args.where?.stripeEventId ?? "";
        const current = (billingEvents.get(eventId) ?? {
          attemptCount: 0,
          id: "be_1",
          stripeEventId: eventId
        }) as Record<string, unknown>;
        const next = applyUpdateData(current, args.data ?? {});
        billingEvents.set(eventId, next);
        return next;
      }
    ),
    stubMethod(
      prisma,
      "$transaction",
      async <T>(callback: (tx: typeof prisma) => Promise<T>): Promise<T> => callback(prisma)
    ),
    stubMethod(prisma.organization, "findFirst", async (args: { where?: { stripeCustomerId?: string } }) => {
      if (args.where?.stripeCustomerId === "cus_alpha") {
        return {
          id: "org_alpha",
          planId: "plan_professional",
          stripeCustomerId: "cus_alpha",
          tenantId: "tenant_alpha"
        };
      }

      return null;
    }),
    stubMethod(prisma.organization, "findUnique", async (args: { where?: { id?: string } }) => {
      if (args.where?.id === "org_alpha") {
        return {
          id: "org_alpha",
          tenantId: "tenant_alpha"
        };
      }

      return null;
    }),
    stubMethod(prisma.subscription, "upsert", async () => ({
      id: "sub_local_1",
      status: "active",
      tenantId: "tenant_alpha"
    })),
    stubMethod(prisma.subscription, "update", async () => {
      subscriptionUpdateCalls += 1;
      return { id: "sub_local_1" };
    }),
    stubMethod(prisma.invoice, "upsert", async () => {
      invoiceUpsertCalls += 1;
      return { id: "invoice_1" };
    })
  ];

  try {
    const app = createWebhookApp(config);

    await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", signature)
      .set("content-type", "application/json")
      .send(payload)
      .expect(200);

    await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", signature)
      .set("content-type", "application/json")
      .send(payload)
      .expect(200);

    await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", signature)
      .set("content-type", "application/json")
      .send(payload)
      .expect(200);

    assert.equal(subscriptionUpdateCalls, 1);
    assert.equal(invoiceUpsertCalls, 1);
    assert.equal(
      billingEvents.get("evt_invoice_paid_1")?.status,
      BillingEventStatus.processed
    );
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});
