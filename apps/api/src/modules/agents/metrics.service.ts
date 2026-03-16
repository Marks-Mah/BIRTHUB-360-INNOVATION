import { prisma } from "@birthub/database";

export type ExecutionStatus = "FAILED" | "SUCCESS";

export interface AgentRunLog {
  agentId: string;
  createdAt: Date;
  durationMs: number;
  status: ExecutionStatus;
  tenantId: string;
  toolCost: number;
}

export interface AgentMetricsSnapshot {
  agentId: string;
  execution_count: number;
  fail_rate: number;
  from: string;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  to: string;
  tool_cost: number;
}

export interface TenantDashboardSnapshot {
  accumulatedCost: number;
  mostUsedAgents: Array<{
    agentId: string;
    executions: number;
  }>;
  recentFailures: AgentRunLog[];
  tenantId: string;
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

function extractDurationMs(input: {
  completedAt: Date | null;
  startedAt: Date;
}): number {
  if (!input.completedAt) {
    return 0;
  }

  return Math.max(0, input.completedAt.getTime() - input.startedAt.getTime());
}

function extractToolCost(metadata: unknown): number {
  if (!metadata || typeof metadata !== "object") {
    return 0;
  }

  const candidate = (metadata as { toolCost?: unknown }).toolCost;
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : 0;
}

function hasDatabaseUrl(): boolean {
  return typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.length > 0;
}

function isDatabaseUnavailableError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "PrismaClientInitializationError" ||
      error.message.includes("Environment variable not found: DATABASE_URL"))
  );
}

async function loadRunLogs(input: {
  agentId?: string;
  since?: Date;
  tenantId: string;
}): Promise<AgentRunLog[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  let rows;
  try {
    rows = await prisma.agentExecution.findMany({
      orderBy: {
        startedAt: "desc"
      },
      where: {
        ...(input.agentId ? { agentId: input.agentId } : {}),
        ...(input.since ? { startedAt: { gte: input.since } } : {}),
        tenantId: input.tenantId
      }
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return [];
    }

    throw error;
  }

  return rows
    .filter((row): row is typeof row & { status: "FAILED" | "SUCCESS" } => row.status !== "RUNNING" && row.status !== "WAITING_APPROVAL")
    .map((row) => ({
      agentId: row.agentId,
      createdAt: row.startedAt,
      durationMs: extractDurationMs({
        completedAt: row.completedAt,
        startedAt: row.startedAt
      }),
      status: row.status,
      tenantId: row.tenantId,
      toolCost: extractToolCost(row.metadata)
    }));
}

export class AgentMetricsService {
  private readonly runLogs: AgentRunLog[] = [];

  recordRun(log: Omit<AgentRunLog, "createdAt"> & { createdAt?: Date }): void {
    this.runLogs.push({
      ...log,
      createdAt: log.createdAt ?? new Date()
    });
  }

  async getMetrics(input: {
    agentId: string;
    tenantId: string;
    windowMinutes?: number;
  }): Promise<AgentMetricsSnapshot> {
    const to = new Date();
    const from = new Date(to.getTime() - (input.windowMinutes ?? 60) * 60 * 1000);
    const logs = [
      ...(await loadRunLogs({
        agentId: input.agentId,
        since: from,
        tenantId: input.tenantId
      })),
      ...this.runLogs.filter(
        (log) =>
          log.agentId === input.agentId &&
          log.tenantId === input.tenantId &&
          log.createdAt.getTime() >= from.getTime()
      )
    ];
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
      tool_cost: Math.round(totalCost * 100) / 100
    };
  }

  async getTenantDashboard(tenantId: string): Promise<TenantDashboardSnapshot> {
    const tenantLogs = [
      ...(await loadRunLogs({ tenantId })),
      ...this.runLogs.filter((log) => log.tenantId === tenantId)
    ];
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
      .slice(0, 10);
    const accumulatedCost = tenantLogs.reduce((total, log) => total + log.toolCost, 0);

    return {
      accumulatedCost: Math.round(accumulatedCost * 100) / 100,
      mostUsedAgents,
      recentFailures,
      tenantId
    };
  }

  async detectFailRateAlerts(
    tenantId: string,
    threshold = 0.2,
    windowMinutes = 5
  ): Promise<FailRateAlert[]> {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    const tenantLogs = [
      ...(await loadRunLogs({
        since,
        tenantId
      })),
      ...this.runLogs.filter(
        (log) => log.tenantId === tenantId && log.createdAt.getTime() >= since.getTime()
      )
    ];
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

  async exportCsv(tenantId: string, agentId?: string): Promise<string> {
    const rows = [
      ...(await loadRunLogs({
        ...(agentId ? { agentId } : {}),
        tenantId
      })),
      ...this.runLogs.filter((log) => log.tenantId === tenantId && (agentId ? log.agentId === agentId : true))
    ];
    const header = "day,agent_id,success,failed,total_cost";
    const buckets = new Map<string, { agentId: string; cost: number; failed: number; success: number }>();

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

export const agentMetricsService = new AgentMetricsService();
