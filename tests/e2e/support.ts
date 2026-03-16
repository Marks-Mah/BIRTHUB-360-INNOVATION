import type { Page } from "@playwright/test";

const demoWorkflowPayload = {
  workflow: {
    definition: {
      steps: [
        {
          config: {},
          id: "step-trigger",
          key: "trigger",
          name: "Trigger",
          type: "TRIGGER"
        },
        {
          config: {},
          id: "step-condition",
          key: "condition",
          name: "Condition",
          type: "CONDITION"
        },
        {
          config: {},
          id: "step-agent",
          key: "agent-engine",
          name: "Agent Engine",
          type: "ACTION"
        }
      ],
      transitions: [
        {
          route: "ALWAYS",
          source: "trigger",
          target: "condition"
        },
        {
          route: "TRUE",
          source: "condition",
          target: "agent-engine"
        }
      ]
    },
    executions: [
      {
        completedAt: "2026-03-13T12:04:00.000Z",
        durationMs: 4000,
        errorMessage: "Agent timeout",
        id: "run-demo-failed",
        startedAt: "2026-03-13T12:00:00.000Z",
        status: "FAILED",
        stepResults: [
          {
            errorMessage: null,
            input: {
              leadId: "lead-001",
              source: "referral",
              tenantId: "birthhub-alpha"
            },
            output: {
              created: true
            },
            status: "SUCCESS",
            step: {
              id: "step-trigger",
              key: "trigger",
              name: "Trigger",
              type: "TRIGGER"
            }
          },
          {
            errorMessage: null,
            input: {
              leadScore: 87,
              minScore: 75
            },
            output: {
              result: true
            },
            status: "SUCCESS",
            step: {
              id: "step-condition",
              key: "condition",
              name: "Condition",
              type: "CONDITION"
            }
          },
          {
            errorMessage: "timeout",
            input: {
              campaign: "welcome-sequence"
            },
            output: null,
            status: "FAILED",
            step: {
              id: "step-agent",
              key: "agent-engine",
              name: "Agent Engine",
              type: "ACTION"
            }
          }
        ]
      }
    ],
    status: "PUBLISHED",
    name: "demo"
  }
};

const evidenceWorkflowPayload = {
  workflow: {
    definition: {
      steps: [
        {
          config: { method: "POST", path: "/webhooks/evidence" },
          id: "step-01",
          isTrigger: true,
          key: "trigger-webhook",
          name: "Webhook Trigger",
          type: "TRIGGER_WEBHOOK"
        },
        {
          config: { template: "normalize-input" },
          id: "step-02",
          key: "normalize",
          name: "Normalize Payload",
          type: "TRANSFORMER"
        },
        {
          config: { expression: "leadScore >= 70" },
          id: "step-03",
          key: "condition",
          name: "Condition",
          type: "CONDITION"
        },
        {
          config: { method: "POST", url: "https://example.com/crm" },
          id: "step-04",
          key: "crm-enrich",
          name: "CRM Enrich",
          type: "HTTP_REQUEST"
        },
        {
          config: { template: "persona-summary" },
          id: "step-05",
          key: "summary",
          name: "Generate Summary",
          type: "TRANSFORMER"
        },
        {
          config: { agentId: "ceo-pack" },
          id: "step-06",
          key: "agent-engine",
          name: "Agent Engine",
          type: "AGENT_EXECUTE"
        },
        {
          config: { channel: "email", template: "premium-offer" },
          id: "step-07",
          key: "send-email",
          name: "Send Email",
          type: "SEND_NOTIFICATION"
        },
        {
          config: { seconds: 300 },
          id: "step-08",
          key: "delay",
          name: "Delay Follow-up",
          type: "DELAY"
        },
        {
          config: { channel: "slack", template: "ops-alert" },
          id: "step-09",
          key: "notify-ops",
          name: "Notify Ops",
          type: "SEND_NOTIFICATION"
        },
        {
          config: { method: "POST", url: "https://example.com/archive" },
          id: "step-10",
          key: "archive-output",
          name: "Archive Output",
          type: "HTTP_REQUEST"
        }
      ],
      transitions: [
        { route: "ALWAYS", source: "trigger-webhook", target: "normalize" },
        { route: "ALWAYS", source: "normalize", target: "condition" },
        { route: "IF_TRUE", source: "condition", target: "crm-enrich" },
        { route: "ALWAYS", source: "crm-enrich", target: "summary" },
        { route: "ALWAYS", source: "summary", target: "agent-engine" },
        { route: "ON_SUCCESS", source: "agent-engine", target: "send-email" },
        { route: "ALWAYS", source: "send-email", target: "delay" },
        { route: "ALWAYS", source: "delay", target: "notify-ops" },
        { route: "ALWAYS", source: "notify-ops", target: "archive-output" }
      ]
    },
    name: "evidence",
    status: "PUBLISHED"
  }
};

export async function bootstrapSession(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("bh_csrf_token", "csrf-e2e");
    localStorage.setItem("bh_tenant_id", "birthhub-alpha");
    localStorage.setItem("bh_user_id", "owner.alpha@birthub.local");
  });
}

export async function mockDemoWorkflowRuns(page: Page): Promise<void> {
  await page.route("**/api/v1/workflows/demo", async (route) => {
    await route.fulfill({
      body: JSON.stringify(demoWorkflowPayload),
      contentType: "application/json",
      status: 200
    });
  });

  await page.route("**/api/v1/workflows/demo/run", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        accepted: true,
        runId: "run-demo-retry"
      }),
      contentType: "application/json",
      status: 202
    });
  });
}

export async function mockExecutionFeedback(
  page: Page,
  executionId = "exec-feedback"
): Promise<void> {
  await page.route(`**/api/v1/executions/${executionId}/feedback`, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        body: JSON.stringify({
          feedback: {
            expectedOutput: "Resposta corrigida",
            notes: "Corrigir contexto",
            rating: -1
          }
        }),
        contentType: "application/json",
        status: 200
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({
        feedback: {
          expectedOutput: "",
          notes: "",
          rating: 0
        }
      }),
      contentType: "application/json",
      status: 200
    });
  });
}

export async function mockEvidenceWorkflowEditor(page: Page): Promise<void> {
  await page.route("**/api/v1/workflows/evidence", async (route) => {
    await route.fulfill({
      body: JSON.stringify(evidenceWorkflowPayload),
      contentType: "application/json",
      status: 200
    });
  });
}
