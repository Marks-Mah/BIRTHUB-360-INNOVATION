import { MarketingRepository, IngestCampaignInput, Campaign } from "../repositories/marketing-repository.js";

export class MarketingService {
  constructor(private readonly marketingRepository: MarketingRepository) {}

  async ingestCampaignData(data: IngestCampaignInput): Promise<Campaign> {
    // In a real scenario, this might involve validation, transformation, or calling an external agent
    return this.marketingRepository.createCampaign(data);
  }

  async listCampaigns(): Promise<Campaign[]> {
    return this.marketingRepository.listCampaigns();
  }
}
