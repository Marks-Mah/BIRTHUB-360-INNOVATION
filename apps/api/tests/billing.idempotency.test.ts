import assert from "node:assert/strict";
import test from "node:test";

import type { ApiConfig } from "@birthub/config";
import { prisma } from "@birthub/database";
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
  const processedEvents = new Set<string>();
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
      return processedEvents.has(eventId) ? { id: "be_1" } : null;
    }),
    stubMethod(prisma.billingEvent, "create", async (args: { data?: { stripeEventId?: string } }) => {
      if (typeof args.data?.stripeEventId === "string") {
        processedEvents.add(args.data.stripeEventId);
      }
      return { id: "be_1" };
    }),
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
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});
