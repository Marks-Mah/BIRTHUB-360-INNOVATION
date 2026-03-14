import { getApiConfig } from "@birthub/config";
import { prisma, Prisma } from "@birthub/database";
import { createLogger } from "@birthub/logger";

import { createStripeClient } from "./stripe.client.js";

const logger = createLogger("billing-sync-plans");

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function parseLimitsMetadata(raw: string | undefined): Prisma.InputJsonValue {
  if (!raw) {
    return {
      agents: 5,
      features: {
        agents: true,
        workflows: true
      },
      workflows: 30
    };
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed && !Array.isArray(parsed)) {
      return parsed as Prisma.InputJsonValue;
    }
  } catch {
    // Ignore malformed metadata and fallback to defaults.
  }

  return {
    agents: 5,
    features: {
      agents: true,
      workflows: true
    },
    workflows: 30
  };
}

async function main(): Promise<void> {
  const config = getApiConfig();
  const stripe = createStripeClient(config);
  const products = await stripe.products.list({
    active: true,
    limit: 100
  });
  const prices = await stripe.prices.list({
    active: true,
    limit: 100,
    type: "recurring"
  });
  let synchronized = 0;

  for (const product of products.data) {
    const recurringPrice = prices.data.find(
      (price) => typeof price.product === "string" && price.product === product.id
    );

    if (!recurringPrice) {
      continue;
    }

    const code = product.metadata.code?.trim().toLowerCase() || slugify(product.name);
    await prisma.plan.upsert({
      create: {
        active: true,
        code,
        currency: recurringPrice.currency,
        description: product.description ?? null,
        limits: parseLimitsMetadata(product.metadata.limits_json),
        monthlyPriceCents: recurringPrice.unit_amount ?? 0,
        name: product.name,
        stripePriceId: recurringPrice.id,
        stripeProductId: product.id,
        yearlyPriceCents:
          recurringPrice.recurring?.interval === "year"
            ? recurringPrice.unit_amount ?? 0
            : null
      },
      update: {
        active: true,
        currency: recurringPrice.currency,
        description: product.description ?? null,
        limits: parseLimitsMetadata(product.metadata.limits_json),
        monthlyPriceCents: recurringPrice.unit_amount ?? 0,
        name: product.name,
        stripePriceId: recurringPrice.id,
        stripeProductId: product.id,
        yearlyPriceCents:
          recurringPrice.recurring?.interval === "year"
            ? recurringPrice.unit_amount ?? 0
            : null
      },
      where: {
        code
      }
    });
    synchronized += 1;
  }

  logger.info({ synchronized }, "Stripe products/prices synced into local plans table");
}

void main()
  .catch((error) => {
    logger.error({ error }, "Failed to sync Stripe plans");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
