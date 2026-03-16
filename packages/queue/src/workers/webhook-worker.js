import { BaseWorker } from "./base-worker";
export class WebhookWorker extends BaseWorker {
    async process(payload) {
        if (payload.failDelivery)
            throw new Error("WEBHOOK_DELIVERY_FAILED");
    }
}
