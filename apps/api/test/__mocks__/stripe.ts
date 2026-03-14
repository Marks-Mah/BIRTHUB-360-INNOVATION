import type Stripe from "stripe";

type StripeOverride = Partial<{
  checkoutUrl: string;
  customerId: string;
  portalUrl: string;
}>;

export function createStripeMock(overrides: StripeOverride = {}): Stripe {
  return {
    billingPortal: {
      sessions: {
        create: async () => ({
          url: overrides.portalUrl ?? "https://billing.stripe.com/session/mock"
        })
      }
    },
    checkout: {
      sessions: {
        create: async () => ({
          id: "cs_test_mock",
          url: overrides.checkoutUrl ?? "https://checkout.stripe.com/pay/cs_test_mock"
        })
      }
    },
    customers: {
      create: async () => ({
        id: overrides.customerId ?? "cus_test_mock"
      })
    },
    webhooks: {
      constructEvent: (payload: Buffer | string) => {
        const json = Buffer.isBuffer(payload) ? payload.toString("utf8") : payload;
        return JSON.parse(json);
      }
    }
  } as unknown as Stripe;
}
