import assert from "node:assert/strict";
import test from "node:test";

import {
  prisma,
  StepResultStatus,
  WorkflowExecutionStatus,
  WorkflowStepOnError,
  WorkflowTriggerType
} from "@birthub/database";
import type { Queue } from "bullmq";

import { type WorkflowExecutionJobPayload, WorkflowRunner } from "./runner.js";

void test("Workflow runner smoke test executes CEO agent and persists the result", async () => {
  const originalFindExecution = prisma.workflowExecution.findUnique.bind(prisma.workflowExecution);
  const originalFindWorkflow = prisma.workflow.findFirst.bind(prisma.workflow);
  const originalFindResults = prisma.stepResult.findMany.bind(prisma.stepResult);
  const originalCreateResult = prisma.stepResult.create.bind(prisma.stepResult);
  const originalUpdateExecution = prisma.workflowExecution.update.bind(prisma.workflowExecution);
  const originalFindQuota = prisma.quotaUsage.findFirst.bind(prisma.quotaUsage);

  const createdResults: Array<Record<string, unknown>> = [];
  const executionUpdates: Array<Record<string, unknown>> = [];
  const agentCalls: Array<{ agentId: string; contextSummary: string; input: Record<string, unknown> }> = [];

  (prisma.workflowExecution.findUnique as unknown as (args: unknown) => Promise<unknown>) =
    async () => ({
      depth: 0,
      id: "exec_agent",
      startedAt: new Date("2026-03-13T12:15:00.000Z"),
      status: WorkflowExecutionStatus.RUNNING
    });
  (prisma.workflow.findFirst as unknown as (args: unknown) => Promise<unknown>) = async () => ({
    id: "wf_agent",
    maxDepth: 10,
    steps: [
      {
        cacheTTLSeconds: 0,
        config: {
          agentId: "ceo-pack",
          input: {
            brief: "{{ trigger.output.topic }}"
          },
          onError: "stop"
        },
        id: "step_agent",
        isTrigger: false,
        key: "agent_step",
        name: "CEO strategic review",
        onError: WorkflowStepOnError.STOP,
        type: "AGENT_EXECUTE"
      }
    ],
    transitions: []
  });
  (prisma.stepResult.findMany as unknown as (args: unknown) => Promise<unknown>) = async () => [];
  (prisma.stepResult.create as unknown as (args: { data: Record<string, unknown> }) => Promise<unknown>) =
    async (args) => {
      createdResults.push(args.data);
      return args.data;
    };
  (prisma.workflowExecution.update as unknown as (args: { data: Record<string, unknown> }) => Promise<unknown>) =
    async (args) => {
      executionUpdates.push(args.data);
      return args.data;
    };
  (prisma.quotaUsage.findFirst as unknown as (args: unknown) => Promise<unknown>) = async () => null;

  try {
    const fakeQueue = {
      add: async () => undefined
    } as unknown as Queue<WorkflowExecutionJobPayload>;
    const runner = new WorkflowRunner(fakeQueue, {
      agentExecutor: {
        execute: async (args) => {
          agentCalls.push(args);
          return {
            agentId: args.agentId,
            summary: `CEO reviewed ${String(args.input.brief)}`,
            verdict: "OK"
          };
        }
      }
    });

    await runner.processExecutionJob({
      attempt: 1,
      executionId: "exec_agent",
      organizationId: "org_1",
      stepKey: "agent_step",
      tenantId: "tenant_1",
      triggerPayload: {
        topic: "expansion plan"
      },
      triggerType: WorkflowTriggerType.MANUAL,
      workflowId: "wf_agent"
    });

    assert.equal(agentCalls.length, 1);
    assert.equal(agentCalls[0]?.agentId, "ceo-pack");
    assert.match(agentCalls[0]?.contextSummary ?? "", /workflow=wf_agent/);
    assert.equal(createdResults.length, 1);
    assert.equal(createdResults[0]?.status, StepResultStatus.SUCCESS);
    assert.deepEqual(createdResults[0]?.output, {
      agentId: "ceo-pack",
      summary: "CEO reviewed expansion plan",
      verdict: "OK"
    });
    assert.ok(executionUpdates.some((update) => update.status === WorkflowExecutionStatus.SUCCESS));
  } finally {
    prisma.workflowExecution.findUnique = originalFindExecution;
    prisma.workflow.findFirst = originalFindWorkflow;
    prisma.stepResult.findMany = originalFindResults;
    prisma.stepResult.create = originalCreateResult;
    prisma.workflowExecution.update = originalUpdateExecution;
    prisma.quotaUsage.findFirst = originalFindQuota;
  }
});
