import { BaseWorker } from "./base-worker";

export interface WebhookJobPayload { destination: string; eventId: string; failDelivery?: boolean }

export class WebhookWorker extends BaseWorker<WebhookJobPayload> {
  protected async process(payload: WebhookJobPayload): Promise<void> {
    if (payload.failDelivery) throw new Error("WEBHOOK_DELIVERY_FAILED");
  }
}
