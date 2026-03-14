import type { ApiConfig } from "@birthub/config";
import Stripe from "stripe";

export const STRIPE_API_VERSION = "2024-12-18.acacia" as Stripe.LatestApiVersion;

let cachedStripeClient: Stripe | null = null;
let cachedSecretKey: string | null = null;

export function createStripeClient(config: ApiConfig): Stripe {
  if (cachedStripeClient && cachedSecretKey === config.STRIPE_SECRET_KEY) {
    return cachedStripeClient;
  }

  cachedStripeClient = new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
    appInfo: {
      name: "BirthHub360 API",
      version: "cycle-7"
    }
  });
  cachedSecretKey = config.STRIPE_SECRET_KEY;

  return cachedStripeClient;
}
