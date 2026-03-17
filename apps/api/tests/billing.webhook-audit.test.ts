import assert from "node:assert/strict";
import test from "node:test";

import type { ApiConfig } from "@birthub/config";
import { BillingEventStatus, prisma } from "@birthub/database";
import express from "express";
import request from "supertest";
import Stripe from "stripe";

import {
  setCacheStoreForTests,
  type CacheStore
} from "../src/common/cache/cache-store.js";
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

function createBillingEventHarness(operations?: string[]) {
  const billingEvents = new Map<string, Record<string, unknown>>();

  return {
    billingEvents,
    restores: [
      stubMethod(prisma.billingEvent, "findUnique", async (args: { where?: { stripeEventId?: string } }) => {
        const eventId = args.where?.stripeEventId ?? "";
        return billingEvents.get(eventId) ?? null;
      }),
      stubMethod(prisma.billingEvent, "create", async (args: { data?: Record<string, unknown> }) => {
        const eventId = String(args.data?.stripeEventId ?? "evt_unknown");
        operations?.push("create");
        const record = {
          attemptCount: 0,
          id: "billing_event_1",
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
            id: "billing_event_1",
            stripeEventId: eventId
          }) as Record<string, unknown>;
          const next = applyUpdateData(current, args.data ?? {});

          if (next.status === BillingEventStatus.processing) {
            operations?.push("processing");
          }

          if (next.status === BillingEventStatus.processed) {
            operations?.push("processed");
          }

          if (next.status === BillingEventStatus.failed) {
            operations?.push("failed");
          }

          billingEvents.set(eventId, next);
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

function createRecordingCacheStore() {
  const values = new Map<string, string>();
  const writes: Array<{ key: string; ttlSeconds: number; value: string }> = [];

  const store: CacheStore = {
    async del(...keys: string[]): Promise<number> {
      for (const key of keys) {
        values.delete(key);
      }

      return keys.length;
    },
    async get(key: string): Promise<string | null> {
      return values.get(key) ?? null;
    },
    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
      writes.push({
        key,
        ttlSeconds,
        value
      });
      values.set(key, value);
    }
  };

  return {
    store,
    writes
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

void test("stripe webhook rejects events outside the replay window", async () => {
  const config = createTestApiConfig();
  const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION
  });
  let billingEventCreated = false;
  const payload = JSON.stringify({
    data: {
      object: {
        id: "pi_replay"
      }
    },
    id: "evt_replay_old",
    object: "event",
    type: "payment_intent.created"
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: config.STRIPE_WEBHOOK_SECRET,
    timestamp:
      Math.floor(Date.now() / 1000) - config.STRIPE_WEBHOOK_TOLERANCE_SECONDS - 15
  });
  const restores = [
    stubMethod(prisma.billingEvent, "create", async () => {
      billingEventCreated = true;
      return { id: "billing_event_1" };
    })
  ];

  try {
    const app = createWebhookApp(config);

    await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", signature)
      .set("content-type", "application/json")
      .send(payload)
      .expect(400);

    assert.equal(billingEventCreated, false);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});

void test("stripe webhook marks billing event as failed when domain processing errors", async () => {
  const config = createTestApiConfig();
  const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION
  });
  const billingEventHarness = createBillingEventHarness();
  const payload = JSON.stringify({
    data: {
      object: {
        id: "pi_failure"
      }
    },
    id: "evt_processing_failure",
    object: "event",
    type: "payment_intent.created"
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: config.STRIPE_WEBHOOK_SECRET
  });

  try {
    const app = createWebhookApp(config, {
      processStripeBillingEvent: async () => {
        throw new Error("domain failed");
      }
    });

    await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", signature)
      .set("content-type", "application/json")
      .send(payload)
      .expect(500);

    const persistedEvent = billingEventHarness.billingEvents.get("evt_processing_failure");

    assert.equal(persistedEvent?.status, BillingEventStatus.failed);
    assert.equal(persistedEvent?.attemptCount, 1);
    assert.match(String(persistedEvent?.lastError ?? ""), /domain failed/);
  } finally {
    for (const restore of billingEventHarness.restores.reverse()) {
      restore();
    }
  }
});

void test("stripe webhook persists the raw event before invoking domain processing and writes idempotency TTL", async () => {
  const config = createTestApiConfig();
  const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION
  });
  const operations: string[] = [];
  const billingEventHarness = createBillingEventHarness(operations);
  const cacheStore = createRecordingCacheStore();
  const payload = JSON.stringify({
    data: {
      object: {
        id: "pi_audit"
      }
    },
    id: "evt_audit_order",
    object: "event",
    type: "payment_intent.created"
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: config.STRIPE_WEBHOOK_SECRET
  });

  setCacheStoreForTests(cacheStore.store);

  try {
    const app = createWebhookApp(config, {
      processStripeBillingEvent: async ({ event }) => {
        operations.push("domain");
        assert.equal(
          billingEventHarness.billingEvents.get(event.id)?.status,
          BillingEventStatus.processing
        );
        return {};
      }
    });

    await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", signature)
      .set("content-type", "application/json")
      .send(payload)
      .expect(200);

    assert.deepEqual(operations.slice(0, 3), ["create", "processing", "domain"]);
    assert.deepEqual(cacheStore.writes, [
      {
        key: "idempotency:stripe_webhook:evt_audit_order",
        ttlSeconds: 86400,
        value: "processed"
      }
    ]);
  } finally {
    setCacheStoreForTests(null);

    for (const restore of billingEventHarness.restores.reverse()) {
      restore();
    }
  }
});
