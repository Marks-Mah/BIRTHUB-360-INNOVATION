export type LeadStatus = "NEW" | "QUALIFIED" | "CONTACTED" | "LOST";

export interface LeadRecord {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  status: LeadStatus;
  score: number;
  assignee: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface UpdateLeadInput {
  name?: string;
  email?: string;
  status?: LeadStatus;
  score?: number;
  assignee?: string;
}

export interface LeadFilters {
  status?: LeadStatus;
  minScore?: number;
  assignee?: string;
}

export interface LeadListParams {
  tenantId: string;
  cursor?: string;
  limit?: number;
  filters?: LeadFilters;
  sortBy?: "createdAt" | "score";
  sortOrder?: "asc" | "desc";
}

export interface LeadListResult {
  data: LeadRecord[];
  nextCursor: string | null;
}

type CreateLeadData = Omit<LeadRecord, "id" | "createdAt" | "tenantId" | "deletedAt">;

export class LeadRepository {
  private readonly items = new Map<string, LeadRecord>();
  private seq = 0;

  constructor(_options?: unknown) {}

  async create(tenantId: string, input: CreateLeadData): Promise<LeadRecord> {

    this.seq += 1;
    const lead: LeadRecord = {
      id: `lead_${String(this.seq).padStart(4, "0")}`,
      tenantId,
      createdAt: new Date().toISOString(),
      deletedAt: null,
      ...input,
    };

    this.items.set(lead.id, lead);
    return lead;
  }

  async list(params: LeadListParams): Promise<LeadListResult> {
    const tenantId = params.tenantId;
    const limit = params.limit ?? 20;
    const sortBy = params.sortBy ?? "createdAt";
    const sortOrder = params.sortOrder ?? "desc";

    const filtered = [...this.items.values()]
      .filter((item) => item.tenantId === tenantId && !item.deletedAt)
      .filter((lead) => {
        if (params.filters?.status && lead.status !== params.filters.status) return false;
        if (params.filters?.assignee && lead.assignee !== params.filters.assignee) return false;
        if (typeof params.filters?.minScore === "number" && lead.score < params.filters.minScore) return false;
        return true;
      })
      .sort((left, right) => {
        const leftValue = sortBy === "score" ? left.score : left.createdAt;
        const rightValue = sortBy === "score" ? right.score : right.createdAt;

        if (leftValue < rightValue) return sortOrder === "asc" ? -1 : 1;
        if (leftValue > rightValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });

    const start = params.cursor ? Math.max(filtered.findIndex((entry) => entry.id === params.cursor) + 1, 0) : 0;
    const data = filtered.slice(start, start + limit);

    return {
      data,
      nextCursor: start + limit < filtered.length && data.length > 0 ? data[data.length - 1].id : null,
    };
  }

  async findById(tenantId: string, id: string): Promise<LeadRecord | null> {
    const item = this.items.get(id);
    return item && item.tenantId === tenantId && !item.deletedAt ? item : null;
  }

  async update(tenantId: string, id: string, input: UpdateLeadInput): Promise<LeadRecord | null> {

    const existing = await this.findById(tenantId, id);
    if (!existing) return null;

    const updated = { ...existing, ...input };
    this.items.set(id, updated);
    return updated;
  }

  async updateStatus(tenantId: string, id: string, status: LeadStatus): Promise<LeadRecord | null> {
    return this.update(tenantId, id, { status });
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const existing = await this.findById(tenantId, id);

    if (!existing) return false;

    this.items.set(id, { ...existing, deletedAt: new Date().toISOString() });
    return true;
  }
}
