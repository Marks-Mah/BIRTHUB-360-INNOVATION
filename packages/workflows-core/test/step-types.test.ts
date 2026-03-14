import assert from "node:assert/strict";
import test from "node:test";

import { executeStep, type WorkflowRuntimeContext } from "../src/index.js";

function createContext(): WorkflowRuntimeContext {
  return {
    executionId: "exec_step_types",
    steps: {
      sourceList: {
        input: null,
        output: [{ id: "lead_1" }, { id: "lead_2" }],
        status: "SUCCESS"
      }
    },
    tenantId: "tenant_alpha",
    trigger: {
      output: {
        email: "ada@birthhub.local",
        score: 88,
        topic: "expansion plan"
      },
      type: "MANUAL"
    },
    workflowId: "wf_step_types"
  };
}

test("trigger step types forward the original trigger payload", async () => {
  const context = createContext();

  const webhook = await executeStep(
    {
      config: {
        method: "POST",
        path: "/webhooks/workflows/lead"
      },
      isTrigger: true,
      key: "trigger_webhook",
      name: "Webhook Trigger",
      type: "TRIGGER_WEBHOOK"
    },
    context
  );
  const cron = await executeStep(
    {
      config: {
        cron: "0 * * * *",
        timezone: "America/Sao_Paulo"
      },
      isTrigger: true,
      key: "trigger_cron",
      name: "Cron Trigger",
      type: "TRIGGER_CRON"
    },
    context
  );
  const event = await executeStep(
    {
      config: {
        topic: "tenant.created"
      },
      isTrigger: true,
      key: "trigger_event",
      name: "Event Trigger",
      type: "TRIGGER_EVENT"
    },
    context
  );

  assert.deepEqual(webhook, context.trigger.output);
  assert.deepEqual(cron, context.trigger.output);
  assert.deepEqual(event, context.trigger.output);
});

test("core workflow step types execute with deterministic outputs", async () => {
  const context = createContext();
  const notifications: Array<{ channel: string; message: string; to: string }> = [];
  const agentCalls: Array<{ agentId: string; contextSummary: string; input: Record<string, unknown> }> = [];

  const condition = (await executeStep(
    {
      config: {
        operator: ">",
        path: "trigger.output.score",
        value: 70
      },
      key: "check_score",
      name: "Check score",
      type: "CONDITION"
    },
    context
  )) as { result: boolean };
  const code = await executeStep(
    {
      config: {
        source: "return { stepCount: Object.keys(input).length, tenantId: context.tenantId };",
        timeout_ms: 250
      },
      key: "derive_context",
      name: "Derive context",
      type: "CODE"
    },
    context
  );
  const transformer = await executeStep(
    {
      config: {
        filter: "non-empty-object",
        map: {
          owner: "{{ trigger.output.email }}",
          tenant: "{{ tenantId }}"
        },
        sourcePath: "steps.sourceList.output"
      },
      key: "map_leads",
      name: "Map leads",
      type: "TRANSFORMER"
    },
    context
  );
  const notification = (await executeStep(
    {
      config: {
        batchWindowMs: 5000,
        channel: "email",
        message: "Lead {{ trigger.output.email }} pronto",
        to: "ops@birthhub.local"
      },
      key: "notify_ops",
      name: "Notify Ops",
      type: "SEND_NOTIFICATION"
    },
    context,
    {
      notificationDispatcher: {
        send: async (message) => {
          notifications.push(message);
        }
      }
    }
  )) as { delivered: boolean };
  const agentResult = await executeStep(
    {
      config: {
        agentId: "ceo-pack",
        input: {
          brief: "{{ trigger.output.topic }}"
        },
        onError: "stop"
      },
      key: "run_ceo",
      name: "Run CEO",
      type: "AGENT_EXECUTE"
    },
    context,
    {
      agentExecutor: {
        execute: async (args) => {
          agentCalls.push(args);
          return {
            agentId: args.agentId,
            summary: `CEO reviewed ${String(args.input.brief)}`
          };
        }
      }
    }
  );
  const extracted = await executeStep(
    {
      config: {
        fields: ["email", "status"],
        text: "email: {{ trigger.output.email }}\nstatus: qualified"
      },
      key: "extract_json",
      name: "Extract JSON",
      type: "AI_TEXT_EXTRACT"
    },
    context
  );
  const delayed = (await executeStep(
    {
      config: {
        duration_ms: 250
      },
      key: "delay_follow_up",
      name: "Delay follow up",
      type: "DELAY"
    },
    context
  )) as { delayMs: number; releaseAt: Date };

  assert.equal(condition.result, true);
  assert.equal((code as { stepCount?: unknown }).stepCount, 1);
  assert.equal((code as { tenantId?: unknown }).tenantId, "tenant_alpha");
  assert.deepEqual(transformer, [
    {
      owner: "ada@birthhub.local",
      tenant: "tenant_alpha"
    },
    {
      owner: "ada@birthhub.local",
      tenant: "tenant_alpha"
    }
  ]);
  assert.equal(notification.delivered, true);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]?.message, "Lead ada@birthhub.local pronto");
  assert.equal(agentCalls[0]?.agentId, "ceo-pack");
  assert.match(agentCalls[0]?.contextSummary ?? "", /workflow=wf_step_types/);
  assert.deepEqual(agentResult, {
    agentId: "ceo-pack",
    summary: "CEO reviewed expansion plan"
  });
  assert.deepEqual(extracted, {
    email: "ada@birthhub.local",
    status: "qualified"
  });
  assert.equal(delayed.delayMs, 250);
  assert.ok(delayed.releaseAt instanceof Date);
});
