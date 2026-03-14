import { AnalyticsRepository } from "../repositories/analytics-repository.js";

export class AnalyticsService {
  constructor(private analyticsRepository: AnalyticsRepository) {}

  async getDashboard() {
    const funnel = await this.analyticsRepository.getFunnelMetrics();
    const attribution = await this.analyticsRepository.getAttributionMetrics();

    return {
      funnel,
      attribution,
    };
  }
}