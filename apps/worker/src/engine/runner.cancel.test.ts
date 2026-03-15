import assert from "node:assert/strict";
import test from "node:test";

import { prisma, WorkflowExecutionStatus, WorkflowTriggerType } from "@birthub/database";
import type { Queue } from "bullmq";

import { type WorkflowExecutionJobPayload, WorkflowRunner } from "./runner.js";

void test("Cancelled execution does not enqueue or process further steps", async () => {
  const originalFindExecution = prisma.workflowExecution.findUnique.bind(prisma.workflowExecution);
  const originalFindWorkflow = prisma.workflow.findFirst.bind(prisma.workflow);

  let workflowLookupCalled = false;
  (prisma.workflowExecution.findUnique as unknown as (args: unknown) => Promise<unknown>) =
    async () => ({
      id: "exec_cancelled",
      status: WorkflowExecutionStatus.CANCELLED
    });
  (prisma.workflow.findFirst as unknown as (args: unknown) => Promise<unknown>) = async () => {
    workflowLookupCalled = true;
    return null;
  };

  try {
    const fakeQueue = {
      add: async () => undefined
    } as unknown as Queue<WorkflowExecutionJobPayload>;
    const runner = new WorkflowRunner(fakeQueue);

    await runner.processExecutionJob({
      attempt: 1,
      executionId: "exec_cancelled",
      organizationId: "org_1",
      stepKey: "trigger",
      tenantId: "tenant_1",
      triggerPayload: {},
      triggerType: WorkflowTriggerType.MANUAL,
      workflowId: "wf_1"
    });

    assert.equal(workflowLookupCalled, false);
  } finally {
    prisma.workflowExecution.findUnique = originalFindExecution;
    prisma.workflow.findFirst = originalFindWorkflow;
  }
});
