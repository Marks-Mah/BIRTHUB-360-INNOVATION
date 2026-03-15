import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

import {
  StepResultStatus,
  WorkflowExecutionStatus,
  WorkflowStepOnError,
  WorkflowTriggerType,
  WorkflowTriggerType as TriggerType,
  WorkflowTransitionRoute
} from "@birthub/database";
import { provisionTestDatabase } from "@birthub/testing";

void test("Workflow runner integration persists DB-backed execution and agent handoff", async (context) => {
  const baseDatabaseUrl = process.env.DATABASE_URL;

  if (!baseDatabaseUrl) {
    context.skip("DATABASE_URL is not configured for integration test.");
    return;
  }

  const handle = await provisionTestDatabase(baseDatabaseUrl);

  try {
    const organization = await handle.prisma.organization.create({
      data: {
        name: "Workflow Integration Org",
        slug: "workflow-integration-org",
        tenantId: "tenant_workflow_integration"
      }
    });
    const workflow = await handle.prisma.workflow.create({
      data: {
        definition: {
          kind: "integration-test"
        },
        maxDepth: 5,
        name: "Workflow Integration",
        organizationId: organization.id,
        status: "PUBLISHED",
        tenantId: organization.tenantId,
        triggerType: WorkflowTriggerType.WEBHOOK
      }
    });
    const triggerStep = await handle.prisma.workflowStep.create({
      data: {
        config: {
          path: "/webhooks/integration"
        },
        isTrigger: true,
        key: "trigger_webhook",
        name: "Trigger Webhook",
        onError: WorkflowStepOnError.STOP,
        organizationId: organization.id,
        tenantId: organization.tenantId,
        type: "TRIGGER_WEBHOOK",
        workflowId: workflow.id
      }
    });
    const agentStep = await handle.prisma.workflowStep.create({
      data: {
        config: {
          agentId: "ceo-pack",
          input: {
            company: "{{ trigger.output.company }}",
            tenantId: "{{ tenantId }}"
          },
          onError: "stop"
        },
        key: "agent_review",
        name: "CEO Review",
        onError: WorkflowStepOnError.STOP,
        organizationId: organization.id,
        tenantId: organization.tenantId,
        type: "AGENT_EXECUTE",
        workflowId: workflow.id
      }
    });

    await handle.prisma.workflowTransition.create({
      data: {
        organizationId: organization.id,
        route: WorkflowTransitionRoute.ALWAYS,
        sourceStepId: triggerStep.id,
        targetStepId: agentStep.id,
        tenantId: organization.tenantId,
        workflowId: workflow.id
      }
    });

    const triggerPayload = {
      company: "Acme Orbit"
    };
    const execution = await handle.prisma.workflowExecution.create({
      data: {
        organizationId: organization.id,
        status: WorkflowExecutionStatus.RUNNING,
        tenantId: organization.tenantId,
        triggerPayload,
        triggerType: TriggerType.WEBHOOK,
        workflowId: workflow.id
      }
    });

    const harnessPath = resolve(import.meta.dirname, "./runner.db-integration.harness.ts");
    const stdout = execFileSync(process.execPath, ["--import", "tsx", harnessPath], {
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: handle.databaseUrl,
        WORKFLOW_TEST_EXECUTION_ID: execution.id,
        WORKFLOW_TEST_ORGANIZATION_ID: organization.id,
        WORKFLOW_TEST_STEP_KEY: triggerStep.key,
        WORKFLOW_TEST_TENANT_ID: organization.tenantId,
        WORKFLOW_TEST_TRIGGER_PAYLOAD: JSON.stringify(triggerPayload),
        WORKFLOW_TEST_WORKFLOW_ID: workflow.id
      },
      timeout: 30_000
    });
    const harnessResult = JSON.parse(stdout) as {
      agentCalls: Array<{
        agentId: string;
        contextSummary: string;
        input: Record<string, unknown>;
      }>;
    };
    const persistedExecution = await handle.prisma.workflowExecution.findUnique({
      include: {
        stepResults: {
          include: {
            step: true
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      where: {
        id: execution.id
      }
    });

    assert.equal(harnessResult.agentCalls.length, 1);
    assert.equal(harnessResult.agentCalls[0]?.agentId, "ceo-pack");
    assert.match(harnessResult.agentCalls[0]?.contextSummary ?? "", /tenant=tenant_workflow_integration/);
    assert.equal(harnessResult.agentCalls[0]?.input.tenantId, organization.tenantId);
    assert.equal(harnessResult.agentCalls[0]?.input.company, "Acme Orbit");

    assert.equal(persistedExecution?.status, WorkflowExecutionStatus.SUCCESS);
    assert.equal(persistedExecution?.tenantId, organization.tenantId);
    assert.equal(persistedExecution?.stepResults.length, 2);

    const agentResult = persistedExecution?.stepResults.find(
      (result) => result.step.key === agentStep.key
    );
    assert.equal(agentResult?.status, StepResultStatus.SUCCESS);
    assert.equal(agentResult?.tenantId, organization.tenantId);
    assert.deepEqual(agentResult?.output, {
      agentId: "ceo-pack",
      reviewedCompany: "Acme Orbit",
      reviewedTenantId: organization.tenantId
    });
  } finally {
    await handle.cleanup();
  }
});
