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

import { WorkflowRunner } from "./runner.js";

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

test("Workflow runner executes HTTP_REQUEST with MSW intercepting external side-effects", async () => {
  const originalFindExecution = prisma.workflowExecution.findUnique;
  const originalFindWorkflow = prisma.workflow.findFirst;
  const originalFindResults = prisma.stepResult.findMany;
  const originalCreateResult = prisma.stepResult.create;
  const originalUpdateExecution = prisma.workflowExecution.update;

  const queuedJobs: Array<{ name: string; options?: Record<string, unknown>; payload: Record<string, unknown> }> = [];
  const createdResults: Array<Record<string, unknown>> = [];
  let outboundBody: unknown = null;

  server.use(
    http.post("https://partner.birthhub.test/lead-score", async ({ request }) => {
      outboundBody = await request.json();

      return HttpResponse.json({
        leadId: "lead_42",
        score: 91
      });
    })
  );

  (prisma.workflowExecution.findUnique as unknown as (args: unknown) => Promise<unknown>) =
    async () => ({
      depth: 0,
      id: "exec_http",
      startedAt: new Date("2026-03-13T12:00:00.000Z"),
      status: WorkflowExecutionStatus.RUNNING
    });
  (prisma.workflow.findFirst as unknown as (args: unknown) => Promise<unknown>) = async () => ({
    id: "wf_http",
    maxDepth: 10,
    steps: [
      {
        cacheTTLSeconds: 0,
        config: {
          body: {
            email: "{{ trigger.output.email }}"
          },
          headers: {
            "x-request-id": "{{ executionId }}"
          },
          method: "POST",
          timeout_ms: 1500,
          url: "https://partner.birthhub.test/lead-score"
        },
        id: "step_http",
        isTrigger: false,
        key: "http_step",
        name: "Call lead score API",
        onError: WorkflowStepOnError.STOP,
        type: "HTTP_REQUEST"
      },
      {
        cacheTTLSeconds: 0,
        config: {
          channel: "email",
          message: "Lead scored",
          to: "ops@birthhub.local"
        },
        id: "step_notify",
        isTrigger: false,
        key: "notify_step",
        name: "Notify Ops",
        onError: WorkflowStepOnError.STOP,
        type: "SEND_NOTIFICATION"
      }
    ],
    transitions: [
      {
        route: WorkflowTransitionRoute.ALWAYS,
        sourceStepId: "step_http",
        targetStepId: "step_notify"
      }
    ]
  });
  (prisma.stepResult.findMany as unknown as (args: unknown) => Promise<unknown>) = async () => [];
  (prisma.stepResult.create as unknown as (args: { data: Record<string, unknown> }) => Promise<unknown>) =
    async (args) => {
      createdResults.push(args.data);
      return args.data;
    };
  (prisma.workflowExecution.update as unknown as (args: { data: Record<string, unknown> }) => Promise<unknown>) =
    async (args) => args.data;

  try {
    const fakeQueue = {
      add: async (name: string, payload: Record<string, unknown>, options?: Record<string, unknown>) => {
        queuedJobs.push({
          name,
          payload,
          ...(options ? { options } : {})
        });
      }
    } as unknown as Queue<any>;
    const runner = new WorkflowRunner(fakeQueue);

    await runner.processExecutionJob({
      attempt: 1,
      executionId: "exec_http",
      organizationId: "org_1",
      stepKey: "http_step",
      tenantId: "tenant_1",
      triggerPayload: {
        email: "ada@birthhub.local"
      },
      triggerType: WorkflowTriggerType.MANUAL,
      workflowId: "wf_http"
    });

    assert.deepEqual(outboundBody, {
      email: "ada@birthhub.local"
    });
    assert.equal(createdResults.length, 1);
    assert.equal(createdResults[0]?.status, StepResultStatus.SUCCESS);
    const output = createdResults[0]?.output as {
      body?: Record<string, unknown>;
      headers?: Record<string, string>;
      status?: number;
    };
    assert.deepEqual(output.body, {
      leadId: "lead_42",
      score: 91
    });
    assert.equal(output.headers?.["content-type"], "application/json");
    assert.equal(output.status, 200);
    assert.equal(queuedJobs.length, 1);
    assert.equal(queuedJobs[0]?.payload.stepKey, "notify_step");
  } finally {
    prisma.workflowExecution.findUnique = originalFindExecution;
    prisma.workflow.findFirst = originalFindWorkflow;
    prisma.stepResult.findMany = originalFindResults;
    prisma.stepResult.create = originalCreateResult;
    prisma.workflowExecution.update = originalUpdateExecution;
  }
});
