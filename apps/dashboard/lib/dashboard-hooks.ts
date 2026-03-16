"use client";

import useSWR from "swr";

import type {
  AttributionItem,
  ContractItem,
  FinanceItem,
  HealthScoreItem,
  PipelineItem
} from "./dashboard-types";

const SWR_OPTIONS = {
  dedupingInterval: 30_000,
  keepPreviousData: true,
  revalidateIfStale: true,
  revalidateOnFocus: true
} as const;

async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin"
  });

  if (!response.ok) {
    throw new Error(`dashboard_fetch_failed:${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function useMetrics() {
  const swr = useSWR<{ pipeline: PipelineItem[]; finance: FinanceItem[] }>(
    "/api/dashboard/metrics",
    fetcher,
    SWR_OPTIONS
  );

  return {
    data: swr.data,
    empty: !swr.isLoading && !swr.error && (!swr.data || swr.data.pipeline.length === 0),
    error: swr.error,
    loading: swr.isLoading
  };
}

export function useAgentStatuses() {
  const swr = useSWR<{ healthScore: HealthScoreItem[] }>(
    "/api/dashboard/agent-statuses",
    fetcher,
    SWR_OPTIONS
  );

  return {
    data: swr.data,
    empty: !swr.isLoading && !swr.error && (!swr.data || swr.data.healthScore.length === 0),
    error: swr.error,
    loading: swr.isLoading
  };
}

export function useRecentTasks() {
  const swr = useSWR<{ contracts: ContractItem[]; attribution: AttributionItem[] }>(
    "/api/dashboard/recent-tasks",
    fetcher,
    SWR_OPTIONS
  );

  return {
    data: swr.data,
    empty: !swr.isLoading && !swr.error && (!swr.data || swr.data.contracts.length === 0),
    error: swr.error,
    loading: swr.isLoading
  };
}

export function useBillingSummary() {
  const swr = useSWR<{ finance: FinanceItem[] }>(
    "/api/dashboard/billing-summary",
    fetcher,
    SWR_OPTIONS
  );

  return {
    data: swr.data,
    empty: !swr.isLoading && !swr.error && (!swr.data || swr.data.finance.length === 0),
    error: swr.error,
    loading: swr.isLoading
  };
}
