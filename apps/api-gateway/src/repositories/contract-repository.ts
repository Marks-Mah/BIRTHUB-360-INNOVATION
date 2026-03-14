import { HttpError } from "../errors/http-error.js";

export type ContractStatus = "DRAFT" | "SENT" | "SIGNED" | "EXPIRED";

export interface ContractVersion {
  version: number;
  documentUrl: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  tenantId: string;
  customerId: string;
  dealId?: string;
  status: ContractStatus;
  deletedAt: string | null;
  versions: ContractVersion[];
}

interface ContractListFilters {
  customerId?: string;
  dealId?: string;
  status?: ContractStatus;
}

export class ContractRepository {
  private readonly contracts = new Map<string, Contract>();
  private seq = 0;

  async create(tenantId: string, customerId: string, documentUrl: string, dealId?: string): Promise<Contract> {
    if (!documentUrl) {
      throw new HttpError(400, "CONTRACT_INVALID_DOCUMENT_URL", "documentUrl is required");
    }

    this.seq += 1;
    const contract: Contract = {
      id: `ctr_${this.seq}`,
      tenantId,
      customerId,
      dealId,
      status: "DRAFT",
      deletedAt: null,
      versions: [{ version: 1, documentUrl, createdAt: new Date().toISOString() }],
    };

    this.contracts.set(contract.id, contract);
    return contract;
  }

  async addVersion(tenantId: string, id: string, documentUrl: string): Promise<Contract> {
    const contract = this.contracts.get(id);
    if (!contract || contract.tenantId !== tenantId || contract.deletedAt) {
      throw new HttpError(404, "CONTRACT_NOT_FOUND", "Contract not found");
    }

    const next = contract.versions.length + 1;
    contract.versions.push({ version: next, documentUrl, createdAt: new Date().toISOString() });
    return contract;
  }

  async updateSignatureStatus(tenantId: string, id: string, status: ContractStatus): Promise<Contract> {
    const contract = this.contracts.get(id);
    if (!contract || contract.tenantId !== tenantId || contract.deletedAt) {
      throw new HttpError(404, "CONTRACT_NOT_FOUND", "Contract not found");
    }

    contract.status = status;
    return contract;
  }


  async list(tenantId: string, cursor?: string, limit = 20, filters: ContractListFilters = {}): Promise<Contract[]> {
    const arr = [...this.contracts.values()]
      .filter((contract) => contract.tenantId === tenantId && !contract.deletedAt)
      .filter((contract) => {
        if (filters.customerId && contract.customerId !== filters.customerId) return false;
        if (filters.dealId && contract.dealId !== filters.dealId) return false;
        if (filters.status && contract.status !== filters.status) return false;
        return true;
      });

    const start = cursor ? Math.max(arr.findIndex((contract) => contract.id === cursor) + 1, 0) : 0;
    return arr.slice(start, start + limit);
  }

  async findByDealId(tenantId: string, dealId: string): Promise<Contract | null> {
    return Array.from(this.contracts.values()).find((contract) => contract.tenantId === tenantId && contract.dealId === dealId && !contract.deletedAt) ?? null;
  }

  async getById(tenantId: string, id: string): Promise<Contract> {
    const contract = this.contracts.get(id);
    if (!contract || contract.tenantId !== tenantId || contract.deletedAt) {
      throw new HttpError(404, "CONTRACT_NOT_FOUND", "Contract not found");
    }

    return contract;
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const contract = this.contracts.get(id);
    if (!contract || contract.tenantId !== tenantId || contract.deletedAt) return false;

    this.contracts.set(id, { ...contract, deletedAt: new Date().toISOString() });
    return true;
  }
}
