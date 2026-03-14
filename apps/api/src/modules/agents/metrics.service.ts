export type ExecutionStatus = "FAILED" | "SUCCESS";

export interface AgentRunLog {
  agentId: string;
  tenantId: string;
  status: ExecutionStatus;
  durationMs: number;
  toolCost: number;
  createdAt: Date;
}

export interface AgentMetricsSnapshot {
  agentId: string;
  execution_count: number;
  fail_rate: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  tool_cost: number;
  from: string;
  to: string;
}

export interface TenantDashboardSnapshot {
  tenantId: string;
  mostUsedAgents: Array<{
    agentId: string;
    executions: number;
  }>;
  recentFailures: AgentRunLog[];
  accumulatedCost: number;
}

export interface FailRateAlert {
  agentId: string;
  failRate: number;
  tenantId: string;
  windowMinutes: number;
}

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = values.slice().sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * percentileValue));
  return sorted[index] ?? 0;
}

function withinWindow(item: AgentRunLog, since: Date): boolean {
  return item.createdAt.getTime() >= since.getTime();
}

export class AgentMetricsService {
  private readonly runLogs: AgentRunLog[] = [];

  recordRun(log: Omit<AgentRunLog, "createdAt"> & { createdAt?: Date }): void {
    this.runLogs.push({
      ...log,
      createdAt: log.createdAt ?? new Date()
    });
  }

  getMetrics(input: {
    tenantId: string;
    agentId: string;
    windowMinutes?: number;
  }): AgentMetricsSnapshot {
    const to = new Date();
    const from = new Date(to.getTime() - (input.windowMinutes ?? 60) * 60 * 1000);

    const logs = this.runLogs.filter(
      (log) => log.tenantId === input.tenantId && log.agentId === input.agentId && withinWindow(log, from)
    );

    const failures = logs.filter((log) => log.status === "FAILED").length;
    const latencies = logs.map((log) => log.durationMs);
    const totalCost = logs.reduce((total, log) => total + log.toolCost, 0);

    return {
      agentId: input.agentId,
      execution_count: logs.length,
      fail_rate: logs.length > 0 ? failures / logs.length : 0,
      from: from.toISOString(),
      p50_latency_ms: percentile(latencies, 0.5),
      p95_latency_ms: percentile(latencies, 0.95),
      p99_latency_ms: percentile(latencies, 0.99),
      to: to.toISOString(),
      tool_cost: totalCost
    };
  }

  getTenantDashboard(tenantId: string): TenantDashboardSnapshot {
    const tenantLogs = this.runLogs.filter((log) => log.tenantId === tenantId);
    const grouped = new Map<string, number>();

    for (const log of tenantLogs) {
      grouped.set(log.agentId, (grouped.get(log.agentId) ?? 0) + 1);
    }

    const mostUsedAgents = Array.from(grouped.entries())
      .map(([agentId, executions]) => ({ agentId, executions }))
      .sort((left, right) => right.executions - left.executions)
      .slice(0, 5);

    const recentFailures = tenantLogs
      .filter((log) => log.status === "FAILED")
      .slice()
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 10);

    const accumulatedCost = tenantLogs.reduce((total, log) => total + log.toolCost, 0);

    return {
      accumulatedCost,
      mostUsedAgents,
      recentFailures,
      tenantId
    };
  }

  detectFailRateAlerts(tenantId: string, threshold = 0.2, windowMinutes = 5): FailRateAlert[] {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    const tenantLogs = this.runLogs.filter((log) => log.tenantId === tenantId && withinWindow(log, since));

    const grouped = new Map<string, AgentRunLog[]>();
    for (const log of tenantLogs) {
      const current = grouped.get(log.agentId) ?? [];
      current.push(log);
      grouped.set(log.agentId, current);
    }

    const alerts: FailRateAlert[] = [];
    for (const [agentId, logs] of grouped.entries()) {
      const failureCount = logs.filter((item) => item.status === "FAILED").length;
      const failRate = logs.length > 0 ? failureCount / logs.length : 0;
      if (failRate > threshold) {
        alerts.push({
          agentId,
          failRate,
          tenantId,
          windowMinutes
        });
      }
    }

    return alerts;
  }

  exportCsv(tenantId: string, agentId?: string): string {
    const rows = this.runLogs
      .filter((log) => log.tenantId === tenantId)
      .filter((log) => (agentId ? log.agentId === agentId : true));
    const header = "day,agent_id,success,failed,total_cost";
    const buckets = new Map<string, { agentId: string; success: number; failed: number; cost: number }>();

    for (const row of rows) {
      const day = row.createdAt.toISOString().slice(0, 10);
      const key = `${day}:${row.agentId}`;
      const current = buckets.get(key) ?? {
        agentId: row.agentId,
        cost: 0,
        failed: 0,
        success: 0
      };

      if (row.status === "FAILED") {
        current.failed += 1;
      } else {
        current.success += 1;
      }

      current.cost += row.toolCost;
      buckets.set(key, current);
    }

    const body = Array.from(buckets.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => {
        const [day] = key.split(":");
        return `${day},${value.agentId},${value.success},${value.failed},${value.cost.toFixed(2)}`;
      });

    return [header, ...body].join("\n");
  }
}
