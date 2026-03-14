import { BillingRepository } from '../repositories/billing.repository';

export class BillingService {
  private repository: BillingRepository;

  constructor() {
    this.repository = new BillingRepository();
  }

  async getBillingSummary(tenantId: string) {
    return this.repository.getSummary(tenantId);
  }
}
