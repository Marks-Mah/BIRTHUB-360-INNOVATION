import { cookies } from "next/headers";

import type { DashboardSnapshot } from "./dashboard-types";

function resolveApiBaseUrl(): string {
  return process.env.API_URL?.trim() || "http://localhost:3000";
}

async function fetchDashboardSection<T>(path: string): Promise<T> {
  const cookieStore = await cookies();
  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    cache: "no-store",
    headers: {
      cookie: cookieStore.toString()
    }
  });

  if (!response.ok) {
    throw new Error(`dashboard_fetch_failed:${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [metrics, statuses, recentTasks, billingSummary] = await Promise.all([
    fetchDashboardSection<{ finance: DashboardSnapshot["finance"]; pipeline: DashboardSnapshot["pipeline"] }>(
      "/api/v1/dashboard/metrics"
    ),
    fetchDashboardSection<{ healthScore: DashboardSnapshot["healthScore"] }>(
      "/api/v1/dashboard/agent-statuses"
    ),
    fetchDashboardSection<{ attribution: DashboardSnapshot["attribution"]; contracts: DashboardSnapshot["contracts"] }>(
      "/api/v1/dashboard/recent-tasks"
    ),
    fetchDashboardSection<{ finance: DashboardSnapshot["finance"] }>(
      "/api/v1/dashboard/billing-summary"
    )
  ]);

  return {
    attribution: recentTasks.attribution,
    contracts: recentTasks.contracts,
    finance: billingSummary.finance,
    healthScore: statuses.healthScore,
    pipeline: metrics.pipeline
  };
}
