import type { ApiConfig } from "@birthub/config";
import { cursorPaginationQuerySchema } from "@birthub/config";
import { Role } from "@birthub/database";
import { Router } from "express";
import { z } from "zod";

import { sendEtaggedJson } from "../../common/cache/index.js";
import {
  RequireRole,
  requireAuthenticatedSession
} from "../../common/guards/index.js";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import { validateBody } from "../../middleware/validate-body.js";
import {
  clearCheckoutIpBan,
  createCheckoutSessionForOrganization,
  createCustomerPortalSessionForOrganization,
  getBillingSnapshot,
  isCheckoutIpTemporarilyBanned,
  listActivePlans,
  listInvoicesForOrganization,
  listUsageForOrganization,
  registerCheckoutDecline
} from "./service.js";

const checkoutRequestSchema = z.object({
  planId: z.string().min(1)
});

export function createBillingRouter(config: ApiConfig): Router {
  const router = Router();

  router.get(
    "/plans",
    asyncHandler(async (request, response) => {
      const plans = await listActivePlans();
      sendEtaggedJson(request, response, {
        items: plans.map((plan) => ({
          code: plan.code,
          currency: plan.currency,
          description: plan.description,
          id: plan.id,
          limits: plan.limits,
          monthlyPriceCents: plan.monthlyPriceCents,
          name: plan.name,
          stripePriceId: plan.stripePriceId,
          yearlyPriceCents: plan.yearlyPriceCents
        }))
      });
    })
  );

  router.post(
    "/checkout",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    validateBody(checkoutRequestSchema),
    asyncHandler(async (request, response) => {
      const requesterIp = request.ip ?? request.header("x-forwarded-for") ?? null;

      if (await isCheckoutIpTemporarilyBanned(requesterIp)) {
        throw new ProblemDetailsError({
          detail: "Checkout temporarily blocked for this IP due to repeated card decline errors.",
          status: 429,
          title: "Too Many Requests"
        });
      }

      try {
        const checkout = await createCheckoutSessionForOrganization({
          config,
          countryCode:
            request.header("x-country-code") ??
            request.header("cf-ipcountry") ??
            request.header("x-vercel-ip-country") ??
            null,
          locale: request.header("accept-language")?.split(",")[0] ?? null,
          organizationReference: request.context.organizationId!,
          planId: request.body.planId
        });

        await clearCheckoutIpBan(requesterIp);

        response.status(200).json({
          checkoutSessionId: checkout.id,
          requestId: request.context.requestId,
          url: checkout.url
        });
      } catch (error) {
        const isCardDecline =
          typeof error === "object" &&
          error !== null &&
          ("decline_code" in error ||
            ("type" in error && (error as { type?: string }).type === "StripeCardError"));

        if (isCardDecline) {
          await registerCheckoutDecline({
            config,
            ipAddress: requesterIp
          });
        }

        throw error;
      }
    })
  );

  router.get(
    "/portal",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const portal = await createCustomerPortalSessionForOrganization({
        config,
        organizationReference: request.context.organizationId!
      });

      response.status(200).json({
        requestId: request.context.requestId,
        url: portal.url
      });
    })
  );

  router.get(
    "/invoices",
    requireAuthenticatedSession,
    asyncHandler(async (request, response) => {
      const pagination = cursorPaginationQuerySchema.parse(request.query);
      const invoices = await listInvoicesForOrganization({
        organizationReference: request.context.organizationId!,
        take: pagination.take,
        ...(pagination.cursor ? { cursor: pagination.cursor } : {})
      });

      response.status(200).json({
        items: invoices.items.map((invoice) => ({
          amountDueCents: invoice.amountDueCents,
          amountPaidCents: invoice.amountPaidCents,
          createdAt: invoice.createdAt.toISOString(),
          currency: invoice.currency,
          hostedInvoiceUrl: invoice.hostedInvoiceUrl,
          id: invoice.id,
          invoicePdfUrl: invoice.invoicePdfUrl,
          periodEnd: invoice.periodEnd?.toISOString() ?? null,
          periodStart: invoice.periodStart?.toISOString() ?? null,
          status: invoice.status,
          stripeInvoiceId: invoice.stripeInvoiceId
        })),
        nextCursor: invoices.nextCursor,
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/usage",
    requireAuthenticatedSession,
    asyncHandler(async (request, response) => {
      const usage = await listUsageForOrganization(request.context.organizationId!);
      const snapshot = await getBillingSnapshot(
        request.context.organizationId!,
        config.BILLING_GRACE_PERIOD_DAYS
      );

      response.status(200).json({
        plan: {
          code: snapshot.plan.code,
          name: snapshot.plan.name
        },
        requestId: request.context.requestId,
        status: snapshot.status,
        usage: usage.byMetric
      });
    })
  );

  return router;
}
