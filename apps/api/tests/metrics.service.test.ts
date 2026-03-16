import assert from "node:assert/strict";
import test from "node:test";

import { AgentMetricsService } from "../src/modules/agents/metrics.service.js";

void test("AgentMetricsService aggregates latency and fail rate", async () => {
  const service = new AgentMetricsService();

  service.recordRun({
    agentId: "agent-1",
    durationMs: 120,
    status: "SUCCESS",
    tenantId: "tenant-1",
    toolCost: 0.01
  });
  service.recordRun({
    agentId: "agent-1",
    durationMs: 300,
    status: "FAILED",
    tenantId: "tenant-1",
    toolCost: 0.02
  });

  const snapshot = await service.getMetrics({
    agentId: "agent-1",
    tenantId: "tenant-1",
    windowMinutes: 60
  });

  assert.equal(snapshot.execution_count, 2);
  assert.equal(snapshot.fail_rate, 0.5);
  assert.ok(snapshot.p95_latency_ms >= snapshot.p50_latency_ms);
  assert.equal(snapshot.tool_cost, 0.03);
});

void test("AgentMetricsService exports CSV rows", async () => {
  const service = new AgentMetricsService();

  service.recordRun({
    agentId: "agent-2",
    durationMs: 90,
    status: "SUCCESS",
    tenantId: "tenant-2",
    toolCost: 0.05
  });

  const csv = await service.exportCsv("tenant-2", "agent-2");
  assert.match(csv, /day,agent_id,success,failed,total_cost/);
  assert.match(csv, /agent-2/);
});
