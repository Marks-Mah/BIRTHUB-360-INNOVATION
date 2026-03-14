import { FinancialRepository } from "../repositories/financial-repository.js";

export class FinancialService {
  constructor(private readonly financialRepository: FinancialRepository) {}

  async getSnapshot(tenantId: string) {
    return this.financialRepository.getSnapshot(tenantId);
  }

  async listInvoices(tenantId: string, cursor?: string, limit?: number) {
    return this.financialRepository.listInvoices(tenantId, cursor, limit);
  }

  async deleteInvoice(tenantId: string, invoiceId: string): Promise<boolean> {
    return this.financialRepository.softDeleteInvoice(tenantId, invoiceId);
  }
}
