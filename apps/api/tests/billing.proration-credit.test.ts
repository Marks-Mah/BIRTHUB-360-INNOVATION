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

void test("customer.subscription.updated creates one proration credit for a downgrade", async () => {
  const config = createTestApiConfig();
  const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION
  });
  const processedEvents = new Set<string>();
  const billingCreditCreates: Array<{ amountCents: number; stripeEventId: string }> = [];
  const payload = JSON.stringify({
    data: {
      object: {
        billing_cycle_anchor: 1_710_000_000,
        canceled_at: null,
        customer: "cus_alpha",
        id: "sub_stripe_1",
        items: {
          data: [
            {
              current_period_end: 1_711_929_600,
              plan: {
                amount: 4900
              },
              price: {
                currency: "usd",
                id: "price_starter_monthly",
                unit_amount: 4900
              }
            }
          ]
        },
        latest_invoice: "in_credit_1",
        metadata: {},
        object: "subscription",
        status: "active"
      },
      previous_attributes: {
        items: {
          data: [
            {
              plan: {
                amount: 14900
              },
              price: {
                id: "price_professional_monthly",
                unit_amount: 14900
              }
            }
          ]
        }
      }
    },
    id: "evt_subscription_downgrade_1",
    object: "event",
    type: "customer.subscription.updated"
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
    stubMethod(prisma.organization, "findFirst", async () => ({
      id: "org_alpha",
      planId: "plan_starter",
      stripeCustomerId: "cus_alpha",
      tenantId: "tenant_alpha"
    })),
    stubMethod(prisma.organization, "update", async () => ({
      id: "org_alpha"
    })),
    stubMethod(prisma.plan, "findFirst", async () => ({
      currency: "usd",
      id: "plan_starter",
      stripePriceId: "price_starter_monthly"
    })),
    stubMethod(prisma.subscription, "upsert", async () => ({
      id: "sub_local_1",
      status: "active",
      tenantId: "tenant_alpha"
    })),
    stubMethod(prisma.subscription, "updateMany", async () => ({
      count: 1
    })),
    stubMethod(prisma.billingCredit, "create", async (args: { data?: { amountCents?: number; stripeEventId?: string } }) => {
      billingCreditCreates.push({
        amountCents: args.data?.amountCents ?? 0,
        stripeEventId: args.data?.stripeEventId ?? ""
      });

      return { id: "credit_1" };
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

    assert.equal(billingCreditCreates.length, 1);
    assert.deepEqual(billingCreditCreates[0], {
      amountCents: 10000,
      stripeEventId: "evt_subscription_downgrade_1"
    });
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});
