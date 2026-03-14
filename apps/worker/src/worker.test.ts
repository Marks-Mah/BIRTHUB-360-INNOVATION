import assert from "node:assert/strict";
import test from "node:test";

import { taskJobSchema } from "@birthub/config";

void test("worker contract keeps request correlation fields", () => {
  const parsed = taskJobSchema.parse({
    agentId: "ceo-pack",
    approvalRequired: true,
    context: {
      actorId: "user_123",
      jobId: "42",
      scopedAt: new Date("2026-03-13T00:00:00.000Z").toISOString(),
      tenantId: "tenant_123"
    },
    estimatedCostBRL: 0.42,
    executionMode: "DRY_RUN",
    payload: {
      channel: "email"
    },
    requestId: "req_123",
    signature: "abc123def456ghi789abc123def456ghi789abc123def456ghi789abc123def4",
    tenantId: "tenant_123",
    type: "send-welcome-email",
    userId: "user_123",
    version: "1"
  });

  assert.equal(parsed.requestId, "req_123");
  assert.equal(parsed.tenantId, "tenant_123");
  assert.equal(parsed.userId, "user_123");
  assert.equal(parsed.context?.tenantId, "tenant_123");
  assert.equal(parsed.executionMode, "DRY_RUN");
  assert.equal(parsed.approvalRequired, true);
});
