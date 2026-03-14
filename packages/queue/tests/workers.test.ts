import test from "node:test";
import assert from "node:assert/strict";
import { AgentWorker, CampaignWorker, ReportWorker, WebhookWorker } from "../src/workers";

test("AgentWorker sends failures to DLQ after max attempts", async () => {
  const worker = new AgentWorker(2);
  const result = await worker.run({ agentId: "sdr", input: {}, shouldFail: true });
  assert.equal(result.status, "dlq");
  assert.equal(result.attempts, 2);
  assert.deepEqual(worker.getMetrics(), { success: 0, failed: 1 });
});

test("CampaignWorker succeeds when payload is valid", async () => {
  const worker = new CampaignWorker(3);
  const result = await worker.run({ campaignId: "cmp-1", channel: "email" });
  assert.equal(result.status, "ok");
  assert.equal(result.attempts, 1);
});

test("ReportWorker supports async heavy report execution", async () => {
  const worker = new ReportWorker(3);
  const result = await worker.run({ reportId: "r1", type: "board" });
  assert.equal(result.status, "ok");
});

test("WebhookWorker uses DLQ for persistent delivery failure", async () => {
  const worker = new WebhookWorker(1);
  const result = await worker.run({ destination: "https://example.com", eventId: "evt-1", failDelivery: true });
  assert.equal(result.status, "dlq");
});
