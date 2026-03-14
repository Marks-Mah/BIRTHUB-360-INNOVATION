import { ContractRepository, ContractStatus } from "../repositories/contract-repository.js";

export class ContractService {
  constructor(private readonly contractRepository: ContractRepository) {}

  async create(tenantId: string, customerId: string, documentUrl: string, dealId?: string) {
    return this.contractRepository.create(tenantId, customerId, documentUrl, dealId);
  }

  async addVersion(tenantId: string, id: string, documentUrl: string) {
    return this.contractRepository.addVersion(tenantId, id, documentUrl);
  }

  async updateSignatureStatus(tenantId: string, id: string, status: ContractStatus) {
    return this.contractRepository.updateSignatureStatus(tenantId, id, status);
  }

  async list(tenantId: string, cursor?: string, limit?: number, filters?: { customerId?: string; dealId?: string; status?: ContractStatus }) {
    return this.contractRepository.list(tenantId, cursor, limit, filters);
  }

  async getById(tenantId: string, id: string) {
    return this.contractRepository.getById(tenantId, id);
  }
}
