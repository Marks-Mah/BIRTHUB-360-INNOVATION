import { createLogger } from "@birthub/logger";

const logger = createLogger("billing-event-bus");

export type BillingEventBusMessage =
  | {
      kind: "billing.dunning.triggered";
      organizationId: string;
      stripeInvoiceId: string;
      tenantId: string;
    }
  | {
      kind: "billing.subscription.reactivated";
      organizationId: string;
      tenantId: string;
    };

export async function publishBillingEvent(message: BillingEventBusMessage): Promise<void> {
  logger.info(message, "Billing EventBus message published");
}
