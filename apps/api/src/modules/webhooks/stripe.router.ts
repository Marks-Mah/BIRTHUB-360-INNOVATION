import type { ApiConfig } from "@birthub/config";
import { BillingEventStatus, Prisma, prisma } from "@birthub/database";
import { createLogger } from "@birthub/logger";
import express, { Router } from "express";
import Redlock from "redlock";
import Stripe from "stripe";

import {
  deleteCacheKeys,
  readCacheValue,
  writeCacheValue
} from "../../common/cache/cache-store.js";
import { ProblemDetailsError, asyncHandler } from "../../lib/problem-details.js";
import { toPrismaJsonValue } from "../../lib/prisma-json.js";
import { getSharedRedis } from "../../lib/redis.js";
import { captureWebhookException } from "../../observability/sentry.js";
import {
  invalidateBillingSnapshotCache,
  processStripeBillingEvent as processStripeBillingDomainEvent,
  type StripeBillingEventContext
} from "../billing/service.js";
import { createStripeClient } from "../billing/stripe.client.js";
import { enqueueCrmSync } from "../engagement/queues.js";

const logger = createLogger("stripe-webhook");

const BILLING_WEBHOOK_IDEMPOTENCY_TTL_SECONDS = 86_400;

let stripeRedlock: Redlock | null = null;

function billingStatusCacheKey(tenantId: string): string {
  return `billing-status:${tenantId}`;
}

function stripeWebhookIdempotencyKey(eventId: string): string {
  return `idempotency:stripe_webhook:${eventId}`;
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

function parseStripeSignatureTimestamp(signature: string): Date {
  const timestampFragment = signature
    .split(",")
    .map((fragment) => fragment.trim())
    .find((fragment) => fragment.startsWith("t="));

  if (!timestampFragment) {
    throw new ProblemDetailsError({
      detail: "Stripe webhook signature is missing the timestamp component.",
      status: 400,
      title: "Bad Request"
    });
  }

  const timestampSeconds = Number(timestampFragment.slice(2));

  if (!Number.isInteger(timestampSeconds) || timestampSeconds <= 0) {
    throw new ProblemDetailsError({
      detail: "Stripe webhook signature contains an invalid timestamp.",
      status: 400,
      title: "Bad Request"
    });
  }

  return new Date(timestampSeconds * 1000);
}

function ensureWebhookWithinReplayWindow(
  signatureTimestamp: Date,
  toleranceSeconds: number
): void {
  const driftMs = Math.abs(Date.now() - signatureTimestamp.getTime());

  if (driftMs <= toleranceSeconds * 1000) {
    return;
  }

  throw new ProblemDetailsError({
    detail: "Stripe webhook timestamp is outside the replay protection window.",
    status: 400,
    title: "Bad Request"
  });
}

function resolveStripeEventCreatedAt(event: Stripe.Event): Date | null {
  return typeof event.created === "number" ? new Date(event.created * 1000) : null;
}

function toWebhookErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return raw.slice(0, 1_000);
}

async function createReceivedBillingEvent(input: {
  event: Stripe.Event;
  signatureTimestamp: Date;
}) {
  try {
    return await prisma.billingEvent.create({
      data: {
        attemptCount: 0,
        eventCreatedAt: resolveStripeEventCreatedAt(input.event),
        payload: toPrismaJsonValue(input.event),
        signatureTimestamp: input.signatureTimestamp,
        status: BillingEventStatus.received,
        stripeEventId: input.event.id,
        type: input.event.type
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.billingEvent.findUnique({
        where: {
          stripeEventId: input.event.id
        }
      });

      if (existing) {
        return existing;
      }
    }

    throw error;
  }
}

async function markBillingEventProcessing(input: {
  event: Stripe.Event;
  signatureTimestamp: Date;
}) {
  return prisma.billingEvent.update({
    data: {
      attemptCount: {
        increment: 1
      },
      eventCreatedAt: resolveStripeEventCreatedAt(input.event),
      failedAt: null,
      lastError: null,
      payload: toPrismaJsonValue(input.event),
      processedAt: null,
      signatureTimestamp: input.signatureTimestamp,
      status: BillingEventStatus.processing,
      type: input.event.type
    },
    where: {
      stripeEventId: input.event.id
    }
  });
}

type StripeWebhookEventProcessor = (input: {
  config: ApiConfig;
  db?: typeof prisma | Prisma.TransactionClient;
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
        logger.warn(
          {
            event: "billing.webhook.signature.missing"
          },
          "Stripe webhook rejected because the signature header is missing"
        );

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

      const signatureTimestamp = parseStripeSignatureTimestamp(signature);

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(
          request.body,
          signature,
          config.STRIPE_WEBHOOK_SECRET,
          Number.MAX_SAFE_INTEGER
        );
      } catch (error) {
        logger.warn(
          {
            err: error,
            event: "billing.webhook.signature.invalid"
          },
          "Stripe webhook rejected because the signature is invalid"
        );

        throw new ProblemDetailsError({
          detail: "Invalid Stripe webhook signature.",
          errors: error instanceof Error ? error.message : "unknown_signature_error",
          status: 400,
          title: "Bad Request"
        });
      }

      try {
        ensureWebhookWithinReplayWindow(
          signatureTimestamp,
          config.STRIPE_WEBHOOK_TOLERANCE_SECONDS
        );
      } catch (error) {
        logger.warn(
          {
            event: "billing.webhook.replay_rejected",
            signatureTimestamp: signatureTimestamp.toISOString(),
            stripeEventId: event.id,
            stripeEventType: event.type,
            toleranceSeconds: config.STRIPE_WEBHOOK_TOLERANCE_SECONDS
          },
          "Stripe webhook rejected because it is outside the replay window"
        );

        throw error;
      }

      const result = await withStripeEventLock(config, event, async () => {
        const idempotencyKey = stripeWebhookIdempotencyKey(event.id);
        const cachedIdempotency = await readCacheValue(idempotencyKey);

        if (cachedIdempotency) {
          const processedRecord = await prisma.billingEvent.findUnique({
            where: {
              stripeEventId: event.id
            }
          });

          if (processedRecord?.status === BillingEventStatus.processed) {
            logger.info(
              {
                event: "billing.webhook.duplicate.cache_hit",
                stripeEventId: event.id,
                stripeEventType: event.type
              },
              "Ignoring duplicate Stripe billing event via cache idempotency"
            );

            return {
              idempotent: true,
              received: true
            };
          }

          await deleteCacheKeys([idempotencyKey]);
        }

        let billingEvent =
          await prisma.billingEvent.findUnique({
            where: {
              stripeEventId: event.id
            }
          });

        if (!billingEvent) {
          billingEvent = await createReceivedBillingEvent({
            event,
            signatureTimestamp
          });
        }

        if (billingEvent.status === BillingEventStatus.processed) {
          try {
            await writeCacheValue(
              idempotencyKey,
              "processed",
              BILLING_WEBHOOK_IDEMPOTENCY_TTL_SECONDS
            );
          } catch (error) {
            logger.error(
              {
                err: error,
                event: "billing.webhook.idempotency.rehydrate_failed",
                stripeEventId: event.id,
                stripeEventType: event.type
              },
              "Failed to rehydrate Stripe webhook idempotency cache"
            );
          }

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

        await markBillingEventProcessing({
          event,
          signatureTimestamp
        });

        let context: StripeBillingEventContext = {};

        try {
          context = await prisma.$transaction(async (tx) => {
            const nextContext = await processStripeBillingEvent({
              config,
              db: tx,
              event
            });

            await tx.billingEvent.update({
              data: {
                failedAt: null,
                lastError: null,
                organizationId: nextContext.organizationId ?? null,
                processedAt: new Date(),
                status: BillingEventStatus.processed,
                tenantId: nextContext.tenantId ?? null
              },
              where: {
                stripeEventId: event.id
              }
            });

            return nextContext;
          });
        } catch (error) {
          await prisma.billingEvent.update({
            data: {
              failedAt: new Date(),
              lastError: toWebhookErrorMessage(error),
              status: BillingEventStatus.failed
            },
            where: {
              stripeEventId: event.id
            }
          });

          logger.error(
            {
              err: error,
              event: "billing.webhook.processing_failed",
              stripeEventId: event.id,
              stripeEventType: event.type
            },
            "Failed to process Stripe billing event"
          );

          captureWebhookException(error, {
            requestId: request.context?.requestId,
            stripeEventId: event.id,
            stripeEventType: event.type,
            traceId: request.context?.traceId
          });

          throw error;
        }

        try {
          await writeCacheValue(
            idempotencyKey,
            "processed",
            BILLING_WEBHOOK_IDEMPOTENCY_TTL_SECONDS
          );
        } catch (error) {
          logger.error(
            {
              err: error,
              event: "billing.webhook.idempotency.write_failed",
              organizationId: context.organizationId ?? null,
              stripeEventId: event.id,
              tenantId: context.tenantId ?? null
            },
            "Failed to write Stripe webhook idempotency cache"
          );

          captureWebhookException(error, {
            organizationId: context.organizationId,
            requestId: request.context?.requestId,
            stripeEventId: event.id,
            stripeEventType: event.type,
            tenantId: context.tenantId,
            traceId: request.context?.traceId
          });
        }

        try {
          if (context.tenantId || context.organizationId) {
            await Promise.all([
              invalidateBillingSnapshotCache([context.organizationId, context.tenantId]),
              ...(context.tenantId
                ? [deleteCacheKeys([billingStatusCacheKey(context.tenantId)])]
                : [])
            ]);
          }

          if (
            config.NODE_ENV !== "test" &&
            context.organizationId &&
            context.tenantId &&
            (event.type === "checkout.session.completed" ||
              event.type === "customer.subscription.updated")
          ) {
            await enqueueCrmSync(config, {
              kind: "company-upsert",
              organizationId: context.organizationId,
              tenantId: context.tenantId
            });
          }
        } catch (error) {
          logger.error(
            {
              err: error,
              event: "billing.webhook.post_commit_failed",
              organizationId: context.organizationId ?? null,
              stripeEventId: event.id,
              stripeEventType: event.type,
              tenantId: context.tenantId ?? null
            },
            "Post-commit Stripe webhook side effect failed"
          );

          captureWebhookException(error, {
            organizationId: context.organizationId,
            requestId: request.context?.requestId,
            stripeEventId: event.id,
            stripeEventType: event.type,
            tenantId: context.tenantId,
            traceId: request.context?.traceId
          });
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
