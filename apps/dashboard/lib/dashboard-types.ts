export type PipelineItem = { stage: string; value: number; trend: string };
export type HealthScoreItem = { client: string; score: number; risk: string; nps: number };
export type FinanceItem = { label: string; value: string; delta: string };
export type AttributionItem = { source: string; leads: number; conversion: string; cac: string };
export type ContractItem = { customer: string; status: string; mrr: string; owner: string };

export type DashboardSnapshot = {
  attribution: AttributionItem[];
  contracts: ContractItem[];
  finance: FinanceItem[];
  healthScore: HealthScoreItem[];
  pipeline: PipelineItem[];
};
