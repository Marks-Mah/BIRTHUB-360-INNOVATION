import assert from "node:assert/strict";
import test from "node:test";

void test("orchestrator worker builds the API payload expected by /events/run", async () => {
  process.env.BIRTHUB_DISABLE_ORCHESTRATOR_AUTOSTART = "1";
  const { QueueName, buildOrchestratorEventPayload } = await import("../worker.js");

  const payload = buildOrchestratorEventPayload(QueueName.DEAL_CLOSED_WON, {
    data: {
      dealId: "deal_42",
      source: "crm",
      tenantId: "tenant_alpha"
    },
    id: "job_01",
    opts: {
      priority: 7
    }
  });

  assert.deepEqual(payload, {
    context: {
      dealId: "deal_42",
      job_id: "job_01",
      priority: 7,
      queue: QueueName.DEAL_CLOSED_WON,
      source: "crm",
      tenant_id: "tenant_alpha",
      tenantId: "tenant_alpha"
    },
    entity_id: "deal_42",
    event_id: `${QueueName.DEAL_CLOSED_WON}:job_01`,
    event_type: "DEAL_CLOSED_WON"
  });
});
