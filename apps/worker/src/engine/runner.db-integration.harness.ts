import type { WorkflowExecutionJobPayload } from "./runner.js";
import { WorkflowRunner } from "./runner.js";

const executionId = process.env.WORKFLOW_TEST_EXECUTION_ID;
const organizationId = process.env.WORKFLOW_TEST_ORGANIZATION_ID;
const stepKey = process.env.WORKFLOW_TEST_STEP_KEY;
const tenantId = process.env.WORKFLOW_TEST_TENANT_ID;
const workflowId = process.env.WORKFLOW_TEST_WORKFLOW_ID;
const triggerPayload = process.env.WORKFLOW_TEST_TRIGGER_PAYLOAD;

if (
  !executionId ||
  !organizationId ||
  !stepKey ||
  !tenantId ||
  !workflowId ||
  !triggerPayload
) {
  throw new Error("WORKFLOW_TEST_* environment variables are required.");
}

const queuedJobs: WorkflowExecutionJobPayload[] = [];
const agentCalls: Array<{
  agentId: string;
  contextSummary: string;
  input: Record<string, unknown>;
}> = [];

const fakeQueue = {
  add: async (_name: string, payload: WorkflowExecutionJobPayload) => {
    queuedJobs.push(payload);
  }
} as {
  add: (name: string, payload: WorkflowExecutionJobPayload) => Promise<void>;
};

const runner = new WorkflowRunner(fakeQueue as never, {
  agentExecutor: {
    execute: async (input) => {
      agentCalls.push(input);

      return {
        agentId: input.agentId,
        reviewedCompany: input.input.company,
        reviewedTenantId: input.input.tenantId
      };
    }
  }
});

await runner.processExecutionJob({
  attempt: 1,
  executionId,
  organizationId,
  stepKey,
  tenantId,
  triggerPayload: JSON.parse(triggerPayload) as Record<string, unknown>,
  triggerType: "WEBHOOK",
  workflowId
});

while (queuedJobs.length > 0) {
  const nextJob = queuedJobs.shift();

  if (!nextJob) {
    continue;
  }

  await runner.processExecutionJob(nextJob);
}

process.stdout.write(
  JSON.stringify({
    agentCalls
  })
);
