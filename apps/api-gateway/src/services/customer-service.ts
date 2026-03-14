import { CustomerRepository } from "../repositories/customer-repository.js";

export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async listHealthScore(tenantId: string, cursor?: string, limit?: number) {
    return this.customerRepository.listWithHealthScore(tenantId, cursor, limit);
  }

  async getTimeline(tenantId: string, customerId: string) {
    return this.customerRepository.listTimeline(tenantId, customerId);
  }

  async submitNps(tenantId: string, customerId: string, score: number, feedback?: string): Promise<void> {
    await this.customerRepository.registerNps(tenantId, customerId, score, feedback);
  }
}
