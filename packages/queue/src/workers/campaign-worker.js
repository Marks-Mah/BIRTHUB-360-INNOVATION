import { BaseWorker } from "./base-worker";
export class CampaignWorker extends BaseWorker {
    async process(payload) {
        if (payload.retryableError)
            throw new Error("CAMPAIGN_RETRY");
    }
}
