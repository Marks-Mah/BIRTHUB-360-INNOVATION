const API_BASE_URL = process.env.API_GATEWAY_URL || "http://localhost:3000/api/v1";
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://localhost:8000";
const REVALIDATE_SECONDS = 30;
const SWR_FETCH_OPTIONS = {
  cache: "force-cache" as const,
  next: { revalidate: REVALIDATE_SECONDS }
};

// Types matching API responses
interface Deal {
  id: string;
  stage: string;
  amount: number;
}

interface Customer {
  id: string;
  name: string;
  healthScore: number;
}

interface FinancialSnapshot {
  mrr: number;
  churnRate: number;
  delinquencyRate: number;
}

interface AttributionMetric {
  source: string;
  leads: number;
  conversionRate: number;
  cac: number;
}

interface Contract {
  id: string;
  customerId: string;
  status: string;
}

export interface AgentLog {
  id: string;
  agentName: string;
  action: string;
  createdAt: string;
  error?: string;
}

export interface OrchestratorHealth {
  status: string;
  flows: string[];
  circuit_breaker_state: string;
}

export async function getPipelineData() {
  try {
    const res = await fetch(`${API_BASE_URL}/deals`, SWR_FETCH_OPTIONS);
    if (!res.ok) throw new Error("Failed to fetch deals");
    const deals: Deal[] = await res.json();

    // Aggregate for dashboard display
    const stages = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CLOSED_WON"];
    return stages.map(stage => ({
      stage,
      value: deals.filter(d => d.stage === stage).length,
      trend: "0%" // Placeholder as history is not yet implemented
    }));
  } catch (error) {
    console.error("Error fetching pipeline data:", error);
    return [];
  }
}

export async function getAgentLogs() {
  try {
    const res = await fetch(`${API_BASE_URL}/agents/logs`, SWR_FETCH_OPTIONS);
    if (!res.ok) throw new Error("Failed to fetch agent logs");
    return (await res.json()) as AgentLog[];
  } catch (error) {
    console.error("Error fetching agent logs:", error);
    return [];
  }
}

export async function getHealthScoreData() {
  try {
    const res = await fetch(`${API_BASE_URL}/customers`, SWR_FETCH_OPTIONS);
    if (!res.ok) throw new Error("Failed to fetch customers");
    const customers: Customer[] = await res.json();

    return customers.map(c => ({
      client: c.name,
      score: c.healthScore,
      risk: c.healthScore > 70 ? "baixo" : c.healthScore > 40 ? "médio" : "alto",
      nps: 0 // Placeholder
    })).slice(0, 5); // Top 5
  } catch (error) {
    console.error("Error fetching health score data:", error);
    return [];
  }
}

export async function getFinanceData() {
  try {
    const res = await fetch(`${API_BASE_URL}/financial/summary`, SWR_FETCH_OPTIONS);
    if (!res.ok) throw new Error("Failed to fetch financial summary");
    const data: FinancialSnapshot = await res.json();

    return [
      { label: "MRR", value: `R$ ${data.mrr.toLocaleString('pt-BR')}`, delta: "0%" },
      { label: "Churn", value: `${data.churnRate}%`, delta: "0pp" },
      { label: "Inadimplência", value: `${data.delinquencyRate}%`, delta: "0pp" }
    ];
  } catch (error) {
    console.error("Error fetching finance data:", error);
    return [
      { label: "MRR", value: "R$ 0", delta: "0%" },
      { label: "Churn", value: "0%", delta: "0pp" },
      { label: "Inadimplência", value: "0%", delta: "0pp" }
    ];
  }
}

export async function getAnalyticsData() {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/attribution`, SWR_FETCH_OPTIONS);
    if (!res.ok) throw new Error("Failed to fetch analytics data");
    const data: AttributionMetric[] = await res.json();

    return data.map(item => ({
      source: item.source,
      leads: item.leads,
      conversion: `${item.conversionRate}%`,
      cac: `R$ ${item.cac}`
    }));
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return [];
  }
}

export async function getContractsData() {
  try {
    const res = await fetch(`${API_BASE_URL}/contracts`, SWR_FETCH_OPTIONS);
    if (!res.ok) throw new Error("Failed to fetch contracts data");
    const contracts: Contract[] = await res.json();

    return contracts.map(c => ({
      customer: `Client ${c.customerId}`, // Should ideally fetch customer name
      status: c.status,
      mrr: "R$ 0", // Contract value not yet in repo
      owner: "System"
    }));
  } catch (error) {
    console.error("Error fetching contracts data:", error);
    return [];
  }
}

export async function getOrchestratorHealth() {
  try {
    const res = await fetch(`${ORCHESTRATOR_URL}/health`, SWR_FETCH_OPTIONS);
    if (!res.ok) throw new Error("Failed to fetch orchestrator health");
    return (await res.json()) as OrchestratorHealth;
  } catch (error) {
    console.error("Error fetching orchestrator health:", error);
    return null;
  }
}
