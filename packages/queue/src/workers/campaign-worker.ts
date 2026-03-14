import { BaseWorker } from "./base-worker";

export interface CampaignJobPayload { campaignId: string; channel: "email" | "whatsapp"; retryableError?: boolean }

export class CampaignWorker extends BaseWorker<CampaignJobPayload> {
  protected async process(payload: CampaignJobPayload): Promise<void> {
    if (payload.retryableError) throw new Error("CAMPAIGN_RETRY");
  }
}
