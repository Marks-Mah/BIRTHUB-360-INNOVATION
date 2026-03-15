import type { ApiConfig } from "@birthub/config";
import {
  Prisma,
  SubscriptionStatus,
  type InvoiceStatus,
  prisma
} from "@birthub/database";
import { createLogger } from "@birthub/logger";
import express, { Router } from "express";
import Redlock from "redlock";
import Stripe from "stripe";

import { deleteCacheKeys } from "../../common/cache/cache-store.js";
import { toPrismaJsonValue } from "../../lib/prisma-json.js";
import { ProblemDetailsError, asyncHandler } from "../../lib/problem-details.js";
import { getSharedRedis } from "../../lib/redis.js";
import { publishBillingEvent } from "../billing/event-bus.js";
import { enqueueCrmSync } from "../engagement/queues.js";
import {
  ensurePlanByCode,
  invalidateBillingSnapshotCache
} from "../billing/service.js";
import { createStripeClient } from "../billing/stripe.client.js";

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
  const object = event.data.object as
    | Stripe.Invoice
    | Stripe.Subscription
    | Stripe.Checkout.Session;
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
    await lock.release().catch(() => undefined);
  }
}

function unixToDate(value: number | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  return new Date(value * 1000);
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return SubscriptionStatus.active;
    case "canceled":
      return SubscriptionStatus.canceled;
    case "past_due":
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
      return SubscriptionStatus.past_due;
    case "paused":
      return SubscriptionStatus.paused;
    case "trialing":
      return SubscriptionStatus.trial;
    default:
      return SubscriptionStatus.trial;
  }
}

async function resolveOrganizationByStripeCustomer(customerId: string) {
  return prisma.organization.findFirst({
    where: {
      stripeCustomerId: customerId
    }
  });
}

function resolveInvoiceStatus(
  candidate: Stripe.Invoice.Status | null | undefined,
  fallback: InvoiceStatus
): InvoiceStatus {
  switch (candidate) {
    case "draft":
      return "draft";
    case "open":
      return "open";
    case "paid":
      return "paid";
    case "void":
      return "void";
    case "uncollectible":
      return "uncollectible";
    default:
      return fallback;
  }
}

function resolveInvoicePeriods(invoice: Stripe.Invoice): {
  periodEnd: Date | null;
  periodStart: Date | null;
} {
  const line = invoice.lines.data[0];
  return {
    periodEnd: unixToDate(line?.period?.end),
    periodStart: unixToDate(line?.period?.start)
  };
}

function resolveInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subscription = invoice.parent?.subscription_details?.subscription ?? null;

  if (typeof subscription === "string") {
    return subscription;
  }

  return subscription?.id ?? null;
}

function resolveSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const periodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number");

  if (periodEnds.length === 0) {
    return unixToDate(subscription.trial_end ?? subscription.cancel_at ?? subscription.billing_cycle_anchor);
  }

  return unixToDate(Math.max(...periodEnds));
}

function buildInvoiceCreateData(input: {
  fallbackStatus: InvoiceStatus;
  invoice: Stripe.Invoice;
  organizationId: string;
  subscriptionId: string;
  tenantId: string;
}): Prisma.InvoiceUncheckedCreateInput {
  const periods = resolveInvoicePeriods(input.invoice);

  return {
    amountDueCents: input.invoice.amount_due,
    amountPaidCents: input.invoice.amount_paid,
    currency: input.invoice.currency,
    dueDate: unixToDate(input.invoice.due_date),
    hostedInvoiceUrl: input.invoice.hosted_invoice_url ?? null,
    invoicePdfUrl: input.invoice.invoice_pdf ?? null,
    organizationId: input.organizationId,
    periodEnd: periods.periodEnd,
    periodStart: periods.periodStart,
    status: resolveInvoiceStatus(input.invoice.status, input.fallbackStatus),
    stripeInvoiceId: input.invoice.id,
    subscriptionId: input.subscriptionId,
    tenantId: input.tenantId
  };
}

function buildInvoiceUpdateData(
  invoice: Stripe.Invoice,
  fallbackStatus: InvoiceStatus
): Prisma.InvoiceUncheckedUpdateInput {
  const periods = resolveInvoicePeriods(invoice);

  return {
    amountDueCents: invoice.amount_due,
    amountPaidCents: invoice.amount_paid,
    dueDate: unixToDate(invoice.due_date),
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdfUrl: invoice.invoice_pdf ?? null,
    periodEnd: periods.periodEnd,
    periodStart: periods.periodStart,
    status: resolveInvoiceStatus(invoice.status, fallbackStatus)
  };
}

async function ensureSubscriptionForOrganization(input: {
  currentPeriodEnd?: Date | null;
  organizationId: string;
  planId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string | null;
}): Promise<{
  id: string;
  status: SubscriptionStatus;
  tenantId: string;
}> {
  const organization = await prisma.organization.findUnique({
    where: {
      id: input.organizationId
    }
  });

  if (!organization) {
    throw new ProblemDetailsError({
      detail: "Organization not found while syncing subscription.",
      status: 404,
      title: "Not Found"
    });
  }

  const createData: Prisma.SubscriptionUncheckedCreateInput = {
    currentPeriodEnd: input.currentPeriodEnd ?? null,
    organizationId: organization.id,
    planId: input.planId,
    status: SubscriptionStatus.active,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId ?? null,
    tenantId: organization.tenantId
  };
  const updateData: Prisma.SubscriptionUncheckedUpdateInput = {
    planId: input.planId,
    status: SubscriptionStatus.active,
    stripeCustomerId: input.stripeCustomerId,
    ...(input.currentPeriodEnd !== undefined ? { currentPeriodEnd: input.currentPeriodEnd } : {}),
    ...(input.stripeSubscriptionId !== undefined
      ? { stripeSubscriptionId: input.stripeSubscriptionId }
      : {})
  };

  return prisma.subscription.upsert({
    create: createData,
    update: updateData,
    where: {
      organizationId: organization.id
    }
  });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<{
  organizationId: string;
  tenantId: string;
}> {
  const customerId = typeof session.customer === "string" ? session.customer : null;
  const metadataOrganizationId = session.metadata?.organizationId;
  let organization = metadataOrganizationId
    ? await prisma.organization.findUnique({
        where: {
          id: metadataOrganizationId
        }
      })
    : null;

  if (!organization && customerId) {
    organization = await resolveOrganizationByStripeCustomer(customerId);
  }

  if (!organization) {
    throw new ProblemDetailsError({
      detail: "Organization not found for checkout.session.completed event.",
      status: 404,
      title: "Not Found"
    });
  }

  const requestedPlanId = session.metadata?.planId;
  const fallbackPlan = await ensurePlanByCode("starter");
  const plan = requestedPlanId
    ? await prisma.plan.findUnique({
        where: {
          id: requestedPlanId
        }
      })
    : null;
  const planId = plan?.id ?? organization.planId ?? fallbackPlan.id;
  const stripeSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;

  await prisma.organization.update({
    data: {
      planId,
      stripeCustomerId: customerId ?? organization.stripeCustomerId
    },
    where: {
      id: organization.id
    }
  });

  await ensureSubscriptionForOrganization({
    currentPeriodEnd: unixToDate(session.expires_at),
    organizationId: organization.id,
    planId,
    stripeCustomerId: customerId ?? organization.stripeCustomerId ?? "",
    stripeSubscriptionId
  });

  return {
    organizationId: organization.id,
    tenantId: organization.tenantId
  };
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<{
  organizationId: string;
  tenantId: string;
}> {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : null;

  if (!customerId) {
    throw new ProblemDetailsError({
      detail: "Stripe invoice is missing customer id.",
      status: 400,
      title: "Bad Request"
    });
  }

  const organization = await resolveOrganizationByStripeCustomer(customerId);

  if (!organization) {
    throw new ProblemDetailsError({
      detail: "Organization not found for invoice.payment_succeeded event.",
      status: 404,
      title: "Not Found"
    });
  }

  const planId = organization.planId ?? (await ensurePlanByCode("starter")).id;
  const stripeSubscriptionId = resolveInvoiceSubscriptionId(invoice);
  const periods = resolveInvoicePeriods(invoice);
  const existingSubscription = await ensureSubscriptionForOrganization({
    currentPeriodEnd: periods.periodEnd,
    organizationId: organization.id,
    planId,
    stripeCustomerId: customerId,
    stripeSubscriptionId
  });

  await prisma.subscription.update({
    data: {
      currentPeriodEnd: periods.periodEnd,
      gracePeriodEndsAt: null,
      status: SubscriptionStatus.active
    },
    where: {
      id: existingSubscription.id
    }
  });

  await prisma.invoice.upsert({
    create: buildInvoiceCreateData({
      fallbackStatus: "paid",
      invoice,
      organizationId: organization.id,
      subscriptionId: existingSubscription.id,
      tenantId: organization.tenantId
    }),
    update: buildInvoiceUpdateData(invoice, "paid"),
    where: {
      stripeInvoiceId: invoice.id
    }
  });

  await publishBillingEvent({
    kind: "billing.subscription.reactivated",
    organizationId: organization.id,
    tenantId: organization.tenantId
  });

  return {
    organizationId: organization.id,
    tenantId: organization.tenantId
  };
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  config: ApiConfig
): Promise<{
  organizationId: string;
  tenantId: string;
}> {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : null;

  if (!customerId) {
    throw new ProblemDetailsError({
      detail: "Stripe invoice is missing customer id.",
      status: 400,
      title: "Bad Request"
    });
  }

  const organization = await resolveOrganizationByStripeCustomer(customerId);

  if (!organization) {
    throw new ProblemDetailsError({
      detail: "Organization not found for invoice.payment_failed event.",
      status: 404,
      title: "Not Found"
    });
  }

  const planId = organization.planId ?? (await ensurePlanByCode("starter")).id;
  const stripeSubscriptionId = resolveInvoiceSubscriptionId(invoice);
  const periods = resolveInvoicePeriods(invoice);
  const gracePeriodEndsAt = new Date(
    Date.now() + config.BILLING_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
  );
  const subscription = await ensureSubscriptionForOrganization({
    currentPeriodEnd: periods.periodEnd,
    organizationId: organization.id,
    planId,
    stripeCustomerId: customerId,
    stripeSubscriptionId
  });

  await prisma.subscription.update({
    data: {
      gracePeriodEndsAt,
      status: SubscriptionStatus.past_due
    },
    where: {
      id: subscription.id
    }
  });

  await prisma.invoice.upsert({
    create: buildInvoiceCreateData({
      fallbackStatus: "past_due",
      invoice,
      organizationId: organization.id,
      subscriptionId: subscription.id,
      tenantId: organization.tenantId
    }),
    update: buildInvoiceUpdateData(invoice, "past_due"),
    where: {
      stripeInvoiceId: invoice.id
    }
  });

  await publishBillingEvent({
    kind: "billing.dunning.triggered",
    organizationId: organization.id,
    stripeInvoiceId: invoice.id,
    tenantId: organization.tenantId
  });

  return {
    organizationId: organization.id,
    tenantId: organization.tenantId
  };
}

async function handleCustomerSubscriptionDeleted(subscription: Stripe.Subscription): Promise<{
  organizationId: string;
  tenantId: string;
}> {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

  if (!customerId) {
    throw new ProblemDetailsError({
      detail: "Stripe subscription is missing customer id.",
      status: 400,
      title: "Bad Request"
    });
  }

  const organization = await resolveOrganizationByStripeCustomer(customerId);

  if (!organization) {
    throw new ProblemDetailsError({
      detail: "Organization not found for customer.subscription.deleted event.",
      status: 404,
      title: "Not Found"
    });
  }

  const starter = await ensurePlanByCode("starter");

  await prisma.organization.update({
    data: {
      planId: starter.id
    },
    where: {
      id: organization.id
    }
  });

  await prisma.subscription.updateMany({
    data: {
      canceledAt: new Date(),
      planId: starter.id,
      status: SubscriptionStatus.canceled,
      stripeSubscriptionId: subscription.id
    },
    where: {
      organizationId: organization.id
    }
  });

  return {
    organizationId: organization.id,
    tenantId: organization.tenantId
  };
}

async function handleCustomerSubscriptionUpdated(subscription: Stripe.Subscription): Promise<{
  organizationId: string;
  tenantId: string;
}> {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

  if (!customerId) {
    throw new ProblemDetailsError({
      detail: "Stripe subscription is missing customer id.",
      status: 400,
      title: "Bad Request"
    });
  }

  const organization = await resolveOrganizationByStripeCustomer(customerId);

  if (!organization) {
    throw new ProblemDetailsError({
      detail: "Organization not found for customer.subscription.updated event.",
      status: 404,
      title: "Not Found"
    });
  }

  const stripePriceId = subscription.items.data[0]?.price?.id;
  const mappedPlan = stripePriceId
    ? await prisma.plan.findFirst({
        where: {
          stripePriceId
        }
      })
    : null;
  const planId = mappedPlan?.id ?? organization.planId ?? (await ensurePlanByCode("starter")).id;

  await prisma.organization.update({
    data: {
      planId
    },
    where: {
      id: organization.id
    }
  });

  await ensureSubscriptionForOrganization({
    currentPeriodEnd: resolveSubscriptionPeriodEnd(subscription),
    organizationId: organization.id,
    planId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id
  });

  await prisma.subscription.updateMany({
    data: {
      canceledAt: unixToDate(subscription.canceled_at),
      currentPeriodEnd: resolveSubscriptionPeriodEnd(subscription),
      status: mapStripeSubscriptionStatus(subscription.status)
    },
    where: {
      organizationId: organization.id
    }
  });

  return {
    organizationId: organization.id,
    tenantId: organization.tenantId
  };
}

async function processStripeEvent(
  event: Stripe.Event,
  config: ApiConfig
): Promise<{ organizationId?: string; tenantId?: string }> {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
    case "invoice.payment_succeeded":
      return handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
    case "invoice.payment_failed":
      return handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, config);
    case "customer.subscription.deleted":
      return handleCustomerSubscriptionDeleted(event.data.object as Stripe.Subscription);
    case "customer.subscription.updated":
      return handleCustomerSubscriptionUpdated(event.data.object as Stripe.Subscription);
    default:
      return {};
  }
}

export function createStripeWebhookRouter(config: ApiConfig): Router {
  const router = Router();
  const stripe = createStripeClient(config);

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
          return {
            idempotent: true,
            received: true
          };
        }

        const context = await processStripeEvent(event, config);

        if (
          context.organizationId &&
          context.tenantId &&
          (event.type === "checkout.session.completed" ||
            event.type === "customer.subscription.updated")
        ) {
          void enqueueCrmSync(config, {
            kind: "company-upsert",
            organizationId: context.organizationId,
            tenantId: context.tenantId
          }).catch(() => undefined);
        }

        try {
          const billingEventData: Prisma.BillingEventUncheckedCreateInput = {
            payload: toPrismaJsonValue(event),
            stripeEventId: event.id,
            type: event.type,
            ...(context.organizationId ? { organizationId: context.organizationId } : {}),
            ...(context.tenantId ? { tenantId: context.tenantId } : {})
          };

          await prisma.billingEvent.create({
            data: billingEventData
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            logger.warn(
              {
                eventId: event.id,
                eventType: event.type
              },
              "Duplicate Stripe event ignored"
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
            invalidateBillingSnapshotCache([
              context.organizationId,
              context.tenantId
            ]),
            ...(context.tenantId
              ? [deleteCacheKeys([billingStatusCacheKey(context.tenantId)])]
              : [])
          ]);
        }

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
