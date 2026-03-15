import assert from "node:assert/strict";
import test from "node:test";

import {
  prisma,
  StepResultStatus,
  WorkflowExecutionStatus,
  WorkflowStepOnError,
  WorkflowTransitionRoute,
  WorkflowTriggerType
} from "@birthub/database";
import type { Queue } from "bullmq";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { type WorkflowExecutionJobPayload, WorkflowRunner } from "./runner.js";

const server = setupServer();

test.before(() => {
  server.listen({ onUnhandledRequest: "error" });
});

test.after(() => {
  server.close();
});

test.afterEach(() => {
  server.resetHandlers();
});

void test("Workflow runner chains HTTP, agent execution and notification with mocked side-effects", async () => {
  const originalFindExecution = prisma.workflowExecution.findUnique.bind(prisma.workflowExecution);
  const originalFindWorkflow = prisma.workflow.findFirst.bind(prisma.workflow);
  const originalFindResults = prisma.stepResult.findMany.bind(prisma.stepResult);
  const originalCreateResult = prisma.stepResult.create.bind(prisma.stepResult);
  const originalUpdateExecution = prisma.workflowExecution.update.bind(prisma.workflowExecution);
  const originalFindQuota = prisma.quotaUsage.findFirst.bind(prisma.quotaUsage);

  const queuedJobs: WorkflowExecutionJobPayload[] = [];
  const createdResults: Array<Record<string, unknown>> = [];
  const executionUpdates: Array<Record<string, unknown>> = [];
  const agentCalls: Array<{ agentId: string; contextSummary: string; input: Record<string, unknown> }> = [];
  const notifications: Array<Record<string, unknown>> = [];
  let outboundBody: unknown = null;
  let executionDepth = 0;
  let executionStatus: WorkflowExecutionStatus = WorkflowExecutionStatus.RUNNING;

  const steps = [
    {
      cacheTTLSeconds: 0,
      config: {
        body: {
          email: "{{ trigger.output.email }}"
        },
        method: "POST",
        timeout_ms: 1_500,
        url: "https://partner.birthhub.test/lead-score"
      },
      id: "step_http",
      isTrigger: false,
      key: "http_step",
      name: "Score lead externally",
      onError: WorkflowStepOnError.STOP,
      type: "HTTP_REQUEST"
    },
    {
      cacheTTLSeconds: 0,
      config: {
        agentId: "ceo-pack",
        input: {
          brief: "Lead {{ trigger.output.email }} scored {{ steps.http_step.output.body.score }}",
          score: "{{ steps.http_step.output.body.score }}"
        }
      },
      id: "step_agent",
      isTrigger: false,
      key: "agent_step",
      name: "CEO review",
      onError: WorkflowStepOnError.STOP,
      type: "AGENT_EXECUTE"
    },
    {
      cacheTTLSeconds: 0,
      config: {
        channel: "email",
        message: "Lead {{ trigger.output.email }} approved by {{ steps.agent_step.output.owner }}",
        to: "ops@birthhub.local"
      },
      id: "step_notify",
      isTrigger: false,
      key: "notify_step",
      name: "Notify ops",
      onError: WorkflowStepOnError.STOP,
      type: "SEND_NOTIFICATION"
    }
  ];

  const stepsById = new Map(steps.map((step) => [step.id, step]));

  server.use(
    http.post("https://partner.birthhub.test/lead-score", async ({ request }) => {
      outboundBody = await request.json();

      return HttpResponse.json({
        leadId: "lead_42",
        score: 91
      });
    })
  );

  (prisma.workflowExecution.findUnique as unknown as (args: unknown) => Promise<unknown>) = async () => ({
    depth: executionDepth,
    id: "exec_chain",
    startedAt: new Date("2026-03-15T12:00:00.000Z"),
    status: executionStatus
  });
  (prisma.workflow.findFirst as unknown as (args: unknown) => Promise<unknown>) = async () => ({
    id: "wf_chain",
    maxDepth: 10,
    steps,
    transitions: [
      {
        route: WorkflowTransitionRoute.ALWAYS,
        sourceStepId: "step_http",
        targetStepId: "step_agent"
      },
      {
        route: WorkflowTransitionRoute.ALWAYS,
        sourceStepId: "step_agent",
        targetStepId: "step_notify"
      }
    ]
  });
  (prisma.stepResult.findMany as unknown as (args: unknown) => Promise<unknown>) = async () =>
    createdResults.map((result) => ({
      ...result,
      step: {
        key: stepsById.get(String(result.stepId))?.key ?? "unknown"
      }
    }));
  (prisma.stepResult.create as unknown as (args: { data: Record<string, unknown> }) => Promise<unknown>) =
    async (args) => {
      createdResults.push(args.data);
      return args.data;
    };
  (prisma.workflowExecution.update as unknown as (args: { data: Record<string, unknown> }) => Promise<unknown>) =
    async (args) => {
      executionUpdates.push(args.data);
      if (typeof args.data.depth === "number") {
        executionDepth = args.data.depth;
      }
      if (typeof args.data.status === "string") {
        executionStatus = args.data.status as WorkflowExecutionStatus;
      }
      return args.data;
    };
  (prisma.quotaUsage.findFirst as unknown as (args: unknown) => Promise<unknown>) = async () => null;

  try {
    const fakeQueue = {
      add: async (_name: string, payload: WorkflowExecutionJobPayload) => {
        queuedJobs.push(payload);
      }
    } as unknown as Queue<WorkflowExecutionJobPayload>;
    const runner = new WorkflowRunner(fakeQueue, {
      agentExecutor: {
        execute: async (args) => {
          agentCalls.push(args);
          return {
            owner: "growth",
            verdict: "APPROVED"
          };
        }
      },
      notificationDispatcher: {
        send: async (payload) => {
          notifications.push(payload as unknown as Record<string, unknown>);
        }
      }
    });

    await runner.processExecutionJob({
      attempt: 1,
      executionId: "exec_chain",
      organizationId: "org_1",
      stepKey: "http_step",
      tenantId: "tenant_1",
      triggerPayload: {
        email: "ada@birthhub.local"
      },
      triggerType: WorkflowTriggerType.MANUAL,
      workflowId: "wf_chain"
    });

    const agentJob = queuedJobs.shift();
    assert.ok(agentJob, "Expected an agent step to be queued");
    await runner.processExecutionJob(agentJob);

    const notifyJob = queuedJobs.shift();
    assert.ok(notifyJob, "Expected a notification step to be queued");
    await runner.processExecutionJob(notifyJob);

    assert.deepEqual(outboundBody, {
      email: "ada@birthhub.local"
    });
    assert.equal(agentCalls.length, 1);
    assert.equal(agentCalls[0]?.agentId, "ceo-pack");
    assert.match(agentCalls[0]?.contextSummary ?? "", /workflow=wf_chain/);
    assert.equal(agentCalls[0]?.input.score, "91");
    assert.match(
      typeof agentCalls[0]?.input.brief === "string" ? agentCalls[0].input.brief : "",
      /ada@birthhub\.local/
    );
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0]?.channel, "email");
    assert.equal(notifications[0]?.to, "ops@birthhub.local");
    assert.match(
      typeof notifications[0]?.message === "string" ? notifications[0].message : "",
      /growth/
    );
    assert.equal(createdResults.length, 3);
    assert.ok(
      createdResults.every((result) => result.status === StepResultStatus.SUCCESS),
      "All chained steps should persist as successful"
    );
    assert.ok(
      executionUpdates.some((update) => update.status === WorkflowExecutionStatus.SUCCESS),
      "Execution should finish as success"
    );
  } finally {
    prisma.workflowExecution.findUnique = originalFindExecution;
    prisma.workflow.findFirst = originalFindWorkflow;
    prisma.stepResult.findMany = originalFindResults;
    prisma.stepResult.create = originalCreateResult;
    prisma.workflowExecution.update = originalUpdateExecution;
    prisma.quotaUsage.findFirst = originalFindQuota;
  }
});
