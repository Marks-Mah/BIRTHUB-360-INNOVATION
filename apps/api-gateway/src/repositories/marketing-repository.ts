export interface Campaign {
  id: string;
  name: string;
  platform: "google" | "meta" | "linkedin";
  status: "ACTIVE" | "PAUSED" | "ENDED";
  budget: number;
  spend: number;
  createdAt: string;
}

export interface IngestCampaignInput {
  name: string;
  platform: "google" | "meta" | "linkedin";
  budget: number;
  externalId?: string;
}

export class MarketingRepository {
  private campaigns = new Map<string, Campaign>();
  private seq = 0;

  async createCampaign(input: IngestCampaignInput): Promise<Campaign> {
    this.seq += 1;
    const campaign: Campaign = {
      id: `camp_${this.seq}`,
      ...input,
      status: "ACTIVE",
      spend: 0,
      createdAt: new Date().toISOString(),
    };
    this.campaigns.set(campaign.id, campaign);
    return campaign;
  }

  async listCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values());
  }

  async findById(id: string): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }
}
