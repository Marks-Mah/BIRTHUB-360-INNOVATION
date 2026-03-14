import { getWebConfig } from "@birthub/config";

export interface MarketplaceSearchResponse {
  facets: {
    domains: Record<string, number>;
    industries: Record<string, number>;
    levels: Record<string, number>;
    personas: Record<string, number>;
    tags: Record<string, number>;
    useCases: Record<string, number>;
  };
  page: number;
  pageSize: number;
  requestId: string;
  results: Array<{
    approvalRate?: number | null;
    agent: {
      description: string;
      id: string;
      name: string;
      prompt: string;
      version: string;
    };
    feedbackCount?: number;
    installable: boolean;
    keywords: string[];
    score: number;
    tags: {
      "use-case": string[];
      domain: string[];
      industry: string[];
      level: string[];
      persona: string[];
    };
    tools: Array<{
      description: string;
      id: string;
      name: string;
    }>;
  }>;
  total: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "x-tenant-id": "birthhub-alpha"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchMarketplaceSearch(
  params: Record<string, string | undefined>
): Promise<MarketplaceSearchResponse> {
  const config = getWebConfig();
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }

  return fetchJson<MarketplaceSearchResponse>(
    `${config.NEXT_PUBLIC_API_URL}/api/v1/agents/search?${query.toString()}`
  );
}

export async function fetchMarketplaceRecommendations(tenantIndustry: string) {
  const config = getWebConfig();
  return fetchJson<{
    recommendations: Array<{
      agent: {
        description: string;
        id: string;
        name: string;
      };
      installable: boolean;
      keywords: string[];
      recommendationScore: number;
      tags: {
        domain: string[];
      };
    }>;
    tenantIndustry: string;
  }>(
    `${config.NEXT_PUBLIC_API_URL}/api/v1/agents/recommendations?tenantIndustry=${encodeURIComponent(tenantIndustry)}`
  );
}

export async function fetchAgentDocs(agentId: string) {
  const config = getWebConfig();
  return fetchJson<{ docs: string }>(
    `${config.NEXT_PUBLIC_API_URL}/api/v1/agents/${encodeURIComponent(agentId)}/docs`
  );
}

export async function fetchAgentChangelog(agentId: string) {
  const config = getWebConfig();
  return fetchJson<{ changelog: string[] }>(
    `${config.NEXT_PUBLIC_API_URL}/api/v1/agents/${encodeURIComponent(agentId)}/changelog`
  );
}

export async function fetchComparisonMatrix() {
  const config = getWebConfig();
  return fetchJson<{
    matrix: Array<{
      agentId: string;
      agentName: string;
      domain: string[];
      keywords: string[];
      tools: string[];
    }>;
  }>(`${config.NEXT_PUBLIC_API_URL}/api/v1/agents/compare/matrix`);
}

export async function fetchBudgetUsage() {
  const config = getWebConfig();
  return fetchJson<{
    alerts: Array<{ level: string; message: string; timestamp: string }>;
    records: Array<{ agentId: string; consumed: number; limit: number }>;
    usageEvents: Array<{ agentId: string; costBRL: number; executionMode: string; timestamp: string }>;
  }>(`${config.NEXT_PUBLIC_API_URL}/api/v1/budgets/usage`);
}

export async function fetchBudgetEstimate(agentId: string) {
  const config = getWebConfig();
  return fetchJson<{ estimate: { avgCostBRL: number; details: string } }>(
    `${config.NEXT_PUBLIC_API_URL}/api/v1/budgets/estimate?agentId=${encodeURIComponent(agentId)}`
  );
}

export async function fetchOutputs(type?: string) {
  const config = getWebConfig();
  const query = type ? `?type=${encodeURIComponent(type)}` : "";

  return fetchJson<{
    outputs: Array<{
      agentId: string;
      createdAt: string;
      id: string;
      outputHash: string;
      status: string;
      type: string;
    }>;
  }>(`${config.NEXT_PUBLIC_API_URL}/api/v1/outputs${query}`);
}

export async function fetchOutputDetail(outputId: string) {
  const config = getWebConfig();
  return fetchJson<{
    integrity: {
      expectedHash: string;
      isValid: boolean;
      recalculatedHash: string;
    };
    output: {
      agentId: string;
      content: string;
      createdAt: string;
      id: string;
      outputHash: string;
      status: string;
      type: string;
    };
  }>(`${config.NEXT_PUBLIC_API_URL}/api/v1/outputs/${encodeURIComponent(outputId)}`);
}
