import { HttpError } from "../errors/http-error.js";

export type DealStage = "NEW" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";

export interface Deal {
  id: string;
  tenantId: string;
  leadId?: string;
  title: string;
  amount: number;
  stage: DealStage;
  proposalSigned?: boolean;
  deletedAt?: string | null;
  updatedAt: string;
}


export interface DealForecast {
  dealId: string;
  tenantId: string;
  confidence: number;
  projectedCloseDate: string;
  projectedRevenue: number;
}

interface DealStageHistory {
  dealId: string;
  from: DealStage;
  to: DealStage;
  changedAt: string;
}

interface CreateDealInput {
  title: string;
  amount: number;
  leadId?: string;
  stage?: DealStage;
  proposalSigned?: boolean;
}

interface DealListFilters {
  stage?: DealStage;
  minAmount?: number;
  maxAmount?: number;
}

const STAGE_TRANSITIONS: Record<DealStage, DealStage[]> = {
  NEW: ["QUALIFIED", "LOST"],
  QUALIFIED: ["PROPOSAL", "LOST"],
  PROPOSAL: ["NEGOTIATION", "LOST"],
  NEGOTIATION: ["WON", "LOST"],
  WON: [],
  LOST: [],
};

export class DealRepository {
  private readonly deals = new Map<string, Deal>();
  private readonly history: DealStageHistory[] = [];
  private seq = 0;

  async create(tenantId: string, input: CreateDealInput): Promise<Deal> {

    this.seq += 1;

    const deal: Deal = {
      id: `deal_${this.seq}`,
      tenantId,
      title: input.title,
      amount: input.amount,
      leadId: input.leadId,
      stage: input.stage ?? "NEW",
      proposalSigned: input.proposalSigned ?? false,
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };

    this.deals.set(deal.id, deal);
    return deal;
  }

  async list(tenantId: string, cursor?: string, limit = 20, filters: DealListFilters = {}): Promise<Deal[]> {
    const items = [...this.deals.values()]
      .filter((deal) => deal.tenantId === tenantId && !deal.deletedAt)
      .filter((deal) => {
        if (filters.stage && deal.stage !== filters.stage) return false;
        if (filters.minAmount !== undefined && deal.amount < filters.minAmount) return false;
        if (filters.maxAmount !== undefined && deal.amount > filters.maxAmount) return false;
        return true;
      });
    const start = cursor ? Math.max(items.findIndex((deal) => deal.id === cursor) + 1, 0) : 0;
    return items.slice(start, start + limit);
  }

  async getById(tenantId: string, id: string): Promise<Deal | null> {
    const deal = this.deals.get(id);
    return deal && deal.tenantId === tenantId && !deal.deletedAt ? deal : null;
  }

  async updateStage(tenantId: string, id: string, toStage: DealStage): Promise<Deal> {

    const deal = await this.getById(tenantId, id);
    if (!deal) {
      throw new HttpError(404, "DEAL_NOT_FOUND", "Deal not found");
    }

    if (!STAGE_TRANSITIONS[deal.stage].includes(toStage)) {
      throw new HttpError(409, "DEAL_INVALID_STAGE_TRANSITION", "Invalid stage transition");
    }

    const changedAt = new Date().toISOString();
    const updated = { ...deal, stage: toStage, updatedAt: changedAt };
    this.deals.set(id, updated);
    this.history.push({ dealId: id, from: deal.stage, to: toStage, changedAt });

    return updated;
  }

  async markProposalGenerated(tenantId: string, id: string): Promise<Deal> {
    const deal = await this.getById(tenantId, id);
    if (!deal) {
      throw new HttpError(404, "DEAL_NOT_FOUND", "Deal not found");
    }

    const updatedAt = new Date().toISOString();
    const updated: Deal = { ...deal, proposalSigned: true, stage: deal.stage === "NEW" ? "PROPOSAL" : deal.stage, updatedAt };
    this.deals.set(id, updated);
    return updated;
  }

  async getForecast(tenantId: string, id: string): Promise<DealForecast> {
    const deal = await this.getById(tenantId, id);
    if (!deal) {
      throw new HttpError(404, "DEAL_NOT_FOUND", "Deal not found");
    }

    const confidenceByStage: Record<DealStage, number> = {
      NEW: 20,
      QUALIFIED: 40,
      PROPOSAL: 65,
      NEGOTIATION: 80,
      WON: 100,
      LOST: 0,
    };

    const confidence = confidenceByStage[deal.stage];
    const projectedRevenue = Math.round((deal.amount * confidence) / 100);
    const now = Date.now();
    const daysByStage: Record<DealStage, number> = {
      NEW: 45,
      QUALIFIED: 30,
      PROPOSAL: 20,
      NEGOTIATION: 10,
      WON: 0,
      LOST: 0,
    };

    const projectedCloseDate = new Date(now + daysByStage[deal.stage] * 24 * 60 * 60 * 1000).toISOString();

    return {
      dealId: deal.id,
      tenantId: deal.tenantId,
      confidence,
      projectedCloseDate,
      projectedRevenue,
    };
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const deal = await this.getById(tenantId, id);
    if (!deal) return false;

    this.deals.set(id, { ...deal, deletedAt: new Date().toISOString() });
    return true;
  }

  async getHistory(tenantId: string, id: string): Promise<DealStageHistory[]> {
    const deal = await this.getById(tenantId, id);
    if (!deal) {
      return [];
    }

    return this.history.filter((entry) => entry.dealId === id);
  }
}
