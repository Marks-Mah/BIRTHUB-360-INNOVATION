import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@birthub/database";
import Stripe from "stripe";

import { createCheckoutSessionForOrganization } from "../src/modules/billing/service.js";
import { createTestApiConfig } from "./test-config.js";

function stubMethod(target: object, key: string, value: unknown): () => void {
  const original = Reflect.get(target, key);
  Reflect.set(target, key, value);
  return () => {
    Reflect.set(target, key, original);
  };
}

void test("checkout session enables automatic tax and propagates locale/country", async () => {
  const checkoutCalls: Stripe.Checkout.SessionCreateParams[] = [];
  const customerUpdates: Array<{ address: { country: string }; customerId: string }> = [];
  const restores = [
    stubMethod(prisma.organization, "findFirst", async (args: { include?: { memberships?: unknown } }) => {
      if (args.include?.memberships) {
        return {
          id: "org_alpha",
          memberships: [],
          name: "Alpha Corp",
          settings: {
            countryCode: "BR",
            locale: "pt-BR"
          },
          stripeCustomerId: "cus_alpha",
          tenantId: "tenant_alpha"
        };
      }

      return {
        id: "org_alpha",
        name: "Alpha Corp",
        settings: {
          countryCode: "BR",
          locale: "pt-BR"
        },
        stripeCustomerId: "cus_alpha",
        tenantId: "tenant_alpha"
      };
    }),
    stubMethod(prisma.plan, "findUnique", async () => ({
      active: true,
      id: "plan_professional",
      stripePriceId: "price_professional"
    }))
  ];

  try {
    const checkout = await createCheckoutSessionForOrganization({
      config: createTestApiConfig(),
      countryCode: "BR",
      locale: "pt-BR",
      organizationReference: "tenant_alpha",
      planId: "plan_professional",
      stripeClient: {
        checkout: {
          sessions: {
            create: async (input: Stripe.Checkout.SessionCreateParams) => {
              checkoutCalls.push(input);
              return {
                id: "cs_test_checkout",
                url: "https://checkout.stripe.com/pay/cs_test_checkout"
              };
            }
          }
        },
        customers: {
          update: async (customerId: string, input: Stripe.CustomerUpdateParams) => {
            const country =
              typeof input.address === "object" &&
              input.address !== null &&
              "country" in input.address &&
              typeof input.address.country === "string"
                ? input.address.country
                : "";

            customerUpdates.push({
              address: {
                country
              },
              customerId
            });

            return {
              id: customerId
            };
          }
        }
      } as unknown as Stripe
    });

    assert.equal(checkout.id, "cs_test_checkout");
    assert.equal(customerUpdates.length, 1);
    assert.deepEqual(customerUpdates[0], {
      address: {
        country: "BR"
      },
      customerId: "cus_alpha"
    });
    assert.equal(checkoutCalls.length, 1);
    assert.equal(checkoutCalls[0]?.automatic_tax?.enabled, true);
    assert.equal(checkoutCalls[0]?.locale, "pt-BR");
    assert.equal(checkoutCalls[0]?.metadata?.countryCode, "BR");
    assert.equal(checkoutCalls[0]?.subscription_data?.proration_behavior, "create_prorations");
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});
