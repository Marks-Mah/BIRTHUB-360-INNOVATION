import type { ApiConfig } from "@birthub/config";
import { Prisma, prisma } from "@birthub/database";
import { createLogger } from "@birthub/logger";
import express, { Router } from "express";
import Redlock from "redlock";
import Stripe from "stripe";

import { deleteCacheKeys } from "../../common/cache/cache-store.js";
import { ProblemDetailsError, asyncHandler } from "../../lib/problem-details.js";
import { toPrismaJsonValue } from "../../lib/prisma-json.js";
import { getSharedRedis } from "../../lib/redis.js";
import {
  invalidateBillingSnapshotCache,
  processStripeBillingEvent as processStripeBillingDomainEvent,
  type StripeBillingEventContext
} from "../billing/service.js";
import { createStripeClient } from "../billing/stripe.client.js";
import { enqueueCrmSync } from "../engagement/queues.js";

const logger = createLogger("stripe-webhook");

let stripeRedlock: Redlock | null = null;

function billingStatusCacheKey(tenantId: string): string {
  return `billing-status:${tenantId}`;
}

function getStripeRedlock(config: ApiConfig): Redlock {
  if (stripeRedlock) {
    return stripeRedlock;
  }

  stripeRedlock = new Redlock([getSharedRedis(config)], {
    retryCount: 3,
    retryDelay: 200,
    retryJitter: 100
  });

  return stripeRedlock;
}

function resolveLockResource(event: Stripe.Event): string {
  const object = event.data.object;
  const candidate =
    ("customer" in object && typeof object.customer === "string" ? object.customer : null) ??
    ("subscription" in object && typeof object.subscription === "string"
      ? object.subscription
      : null) ??
    ("metadata" in object && typeof object.metadata?.organizationId === "string"
      ? object.metadata.organizationId
      : null) ??
    event.id;

  return `locks:stripe:${candidate}`;
}

async function withStripeEventLock<T>(
  config: ApiConfig,
  event: Stripe.Event,
  callback: () => Promise<T>
): Promise<T> {
  if (config.NODE_ENV === "test") {
    return callback();
  }

  const lock = await getStripeRedlock(config).acquire([resolveLockResource(event)], 10_000);

  try {
    return await callback();
  } finally {
    await lock.release().catch((error) => {
      logger.warn(
        {
          err: error,
          stripeEventId: event.id,
          stripeEventType: event.type
        },
        "Failed to release Stripe event lock"
      );
    });
  }
}

type StripeWebhookEventProcessor = (input: {
  config: ApiConfig;
  event: Stripe.Event;
}) => Promise<StripeBillingEventContext>;

export interface StripeWebhookRouterDependencies {
  processStripeBillingEvent?: StripeWebhookEventProcessor;
}

export function createStripeWebhookRouter(
  config: ApiConfig,
  dependencies: StripeWebhookRouterDependencies = {}
): Router {
  const router = Router();
  const stripe = createStripeClient(config);
  const processStripeBillingEvent =
    dependencies.processStripeBillingEvent ?? processStripeBillingDomainEvent;

  router.post(
    "/stripe",
    express.raw({ type: "application/json" }),
    asyncHandler(async (request, response) => {
      const signature = request.header("stripe-signature");

      if (!signature) {
        throw new ProblemDetailsError({
          detail: "Missing Stripe signature header.",
          status: 400,
          title: "Bad Request"
        });
      }

      if (!Buffer.isBuffer(request.body)) {
        throw new ProblemDetailsError({
          detail: "Stripe webhook payload must be read as raw body.",
          status: 400,
          title: "Bad Request"
        });
      }

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(
          request.body,
          signature,
          config.STRIPE_WEBHOOK_SECRET
        );
      } catch (error) {
        throw new ProblemDetailsError({
          detail: "Invalid Stripe webhook signature.",
          errors: error instanceof Error ? error.message : "unknown_signature_error",
          status: 400,
          title: "Bad Request"
        });
      }

      const result = await withStripeEventLock(config, event, async () => {
        const existing = await prisma.billingEvent.findUnique({
          where: {
            stripeEventId: event.id
          }
        });

        if (existing) {
          logger.info(
            {
              event: "billing.webhook.duplicate",
              stripeEventId: event.id,
              stripeEventType: event.type
            },
            "Ignoring duplicate Stripe billing event"
          );

          return {
            idempotent: true,
            received: true
          };
        }

        const context = await processStripeBillingEvent({
          config,
          event
        });

        if (
          config.NODE_ENV !== "test" &&
          context.organizationId &&
          context.tenantId &&
          (event.type === "checkout.session.completed" ||
            event.type === "customer.subscription.updated")
        ) {
          void enqueueCrmSync(config, {
            kind: "company-upsert",
            organizationId: context.organizationId,
            tenantId: context.tenantId
          }).catch((error) => {
            logger.error(
              {
                err: error,
                event: "billing.webhook.crm_sync_enqueue_failed",
                organizationId: context.organizationId,
                stripeEventId: event.id,
                tenantId: context.tenantId
              },
              "Failed to enqueue CRM sync after Stripe billing event"
            );
          });
        }

        try {
          await prisma.billingEvent.create({
            data: {
              payload: toPrismaJsonValue(event),
              stripeEventId: event.id,
              type: event.type,
              ...(context.organizationId ? { organizationId: context.organizationId } : {}),
              ...(context.tenantId ? { tenantId: context.tenantId } : {})
            }
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            logger.warn(
              {
                event: "billing.webhook.duplicate_race",
                stripeEventId: event.id,
                stripeEventType: event.type
              },
              "Duplicate Stripe billing event ignored after concurrent insert"
            );

            return {
              idempotent: true,
              received: true
            };
          }

          throw error;
        }

        if (context.tenantId || context.organizationId) {
          await Promise.all([
            invalidateBillingSnapshotCache([context.organizationId, context.tenantId]),
            ...(context.tenantId
              ? [deleteCacheKeys([billingStatusCacheKey(context.tenantId)])]
              : [])
          ]);
        }

        logger.info(
          {
            event: "billing.webhook.processed",
            organizationId: context.organizationId ?? null,
            stripeEventId: event.id,
            stripeEventType: event.type,
            tenantId: context.tenantId ?? null
          },
          "Processed Stripe billing event"
        );

        return {
          idempotent: false,
          received: true
        };
      });

      response.status(200).json(result);
    })
  );

  return router;
}
