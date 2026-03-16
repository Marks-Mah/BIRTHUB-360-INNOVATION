import { createHash, randomUUID } from "node:crypto";

import type { ApiConfig } from "@birthub/config";
import {
  Prisma,
  prisma,
  WorkflowExecutionStatus,
  WorkflowStatus,
  WorkflowTriggerType
} from "@birthub/database";
import { validateDag, type WorkflowCanvas } from "@birthub/workflows-core";

import { ProblemDetailsError } from "../../lib/problem-details.js";
import { readNumericPlanLimit } from "../billing/plan.utils.js";
import { getBillingSnapshot } from "../billing/service.js";
import {
  enqueueWorkflowExecution,
  enqueueWorkflowTrigger,
  scheduleCronWorkflow
} from "./runnerQueue.js";
import type {
  WorkflowCreateInput,
  WorkflowRunInput,
  WorkflowUpdateInput
} from "./schemas.js";

export interface ScopedIdentity {
  organizationId: string;
  tenantId: string;
}

type PersistedWorkflow = Awaited<ReturnType<typeof getWorkflowById>>;
type WorkflowWriteClient = Pick<typeof prisma, "workflowStep" | "workflowTransition">;

async function resolveScopedIdentity(tenantReference: string): Promise<ScopedIdentity> {
  const organization = await prisma.organization.findFirst({
    where: {
      OR: [{ id: tenantReference }, { tenantId: tenantReference }]
    }
  });

  if (!organization) {
    throw new Error("ORGANIZATION_NOT_FOUND");
  }

  return {
    organizationId: organization.id,
    tenantId: organization.tenantId
  };
}

async function assertWorkflowLimit(identity: ScopedIdentity): Promise<void> {
  const snapshot = await getBillingSnapshot(identity.tenantId, 3);
  const limit = readNumericPlanLimit(snapshot.plan.limits, "workflows", 30);

  if (!Number.isFinite(limit)) {
    return;
  }

  const current = await prisma.workflow.count({
    where: {
      archivedAt: null,
      tenantId: identity.tenantId
    }
  });

  if (current >= limit) {
    throw new ProblemDetailsError({
      detail: `The active plan allows ${limit} workflows. Upgrade to create more.`,
      status: 402,
      title: "Payment Required"
    });
  }
}

function ensureCanvasIsDag(canvas: WorkflowCanvas): void {
  validateDag({
    edges: canvas.transitions.map((transition) => ({
      route: transition.route,
      source: transition.source,
      target: transition.target
    })),
    nodes: canvas.steps.map((step) => ({
      id: step.key,
      isTrigger: "isTrigger" in step ? step.isTrigger : false,
      type: step.type
    }))
  });
}

function getTriggerStepKey(canvas: WorkflowCanvas): string {
  const explicitTrigger = canvas.steps.find(
    (step) =>
      step.type === "TRIGGER_WEBHOOK" ||
      step.type === "TRIGGER_CRON" ||
      step.type === "TRIGGER_EVENT"
  );

  return explicitTrigger?.key ?? canvas.steps[0]!.key;
}

function createWebhookSecret(identity: ScopedIdentity, workflowName: string): string {
  return createHash("sha256")
    .update(`${identity.tenantId}:${workflowName}:${Date.now()}:${randomUUID()}`)
    .digest("hex");
}

async function persistCanvas(
  client: WorkflowWriteClient,
  identity: ScopedIdentity,
  workflowId: string,
  canvas: WorkflowCanvas
): Promise<void> {
  const stepIdByKey = new Map<string, string>();

  for (const step of canvas.steps) {
    const created = await client.workflowStep.create({
      data: {
        config: step.config as Prisma.InputJsonValue,
        isTrigger:
          step.type === "TRIGGER_WEBHOOK" ||
          step.type === "TRIGGER_CRON" ||
          step.type === "TRIGGER_EVENT",
        key: step.key,
        name: step.name,
        organizationId: identity.organizationId,
        tenantId: identity.tenantId,
        type: step.type,
        workflowId
      }
    });

    stepIdByKey.set(step.key, created.id);
  }

  for (const transition of canvas.transitions) {
    const sourceStepId = stepIdByKey.get(transition.source);
    const targetStepId = stepIdByKey.get(transition.target);

    if (!sourceStepId || !targetStepId) {
      throw new Error("WORKFLOW_TRANSITION_MISSING_ENDPOINT");
    }

    await client.workflowTransition.create({
      data: {
        organizationId: identity.organizationId,
        route: transition.route,
        sourceStepId,
        targetStepId,
        tenantId: identity.tenantId,
        workflowId
      }
    });
  }
}

async function upsertCronTrigger(config: ApiConfig, workflow: {
  cronExpression: string | null;
  id: string;
  organizationId: string;
  tenantId: string;
}): Promise<void> {
  if (!workflow.cronExpression) {
    return;
  }

  await scheduleCronWorkflow(config, {
    cron: workflow.cronExpression,
    organizationId: workflow.organizationId,
    tenantId: workflow.tenantId,
    triggerPayload: {} as Prisma.InputJsonValue as Record<string, unknown>,
    triggerType: WorkflowTriggerType.CRON,
    workflowId: workflow.id
  });
}

export async function getWorkflowById(
  workflowId: string,
  tenantId: string
) {
  return prisma.workflow.findFirst({
    include: {
      executions: {
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
        orderBy: {
          startedAt: "desc"
        },
        take: 25
      },
      steps: true,
      transitions: true
    },
    where: {
      id: workflowId,
      tenantId
    }
  });
}

export async function listWorkflows(tenantId: string) {
  return prisma.workflow.findMany({
    include: {
      _count: {
        select: {
          executions: true,
          steps: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    where: {
      tenantId
    }
  });
}

export async function createWorkflow(
  config: ApiConfig,
  tenantReference: string,
  input: WorkflowCreateInput
): Promise<PersistedWorkflow> {
  const identity = await resolveScopedIdentity(tenantReference);
  await assertWorkflowLimit(identity);
  ensureCanvasIsDag(input.canvas);

  if (input.status === WorkflowStatus.PUBLISHED) {
    getTriggerStepKey(input.canvas);
  }

  const workflow = await prisma.$transaction(async (tx) => {
    const created = await tx.workflow.create({
      data: {
        archivedAt: input.status === WorkflowStatus.ARCHIVED ? new Date() : null,
        cronExpression: input.cronExpression ?? null,
        definition: input.canvas as Prisma.InputJsonValue,
        description: input.description ?? null,
        eventTopic: input.eventTopic ?? null,
        maxDepth: input.maxDepth,
        name: input.name,
        organizationId: identity.organizationId,
        publishedAt: input.status === WorkflowStatus.PUBLISHED ? new Date() : null,
        status: input.status,
        tenantId: identity.tenantId,
        triggerConfig: input.triggerConfig as Prisma.InputJsonValue,
        triggerType: input.triggerType,
        webhookSecret:
          input.triggerType === WorkflowTriggerType.WEBHOOK
            ? createWebhookSecret(identity, input.name)
            : null
      }
    });

    await persistCanvas(tx, identity, created.id, input.canvas);
    return created;
  });

  if (input.triggerType === WorkflowTriggerType.CRON) {
    await upsertCronTrigger(config, {
      cronExpression: workflow.cronExpression,
      id: workflow.id,
      organizationId: workflow.organizationId,
      tenantId: workflow.tenantId
    });
  }

  const persisted = await getWorkflowById(workflow.id, identity.tenantId);
  if (!persisted) {
    throw new Error("WORKFLOW_CREATE_FAILED");
  }

  return persisted;
}

export async function updateWorkflow(
  config: ApiConfig,
  workflowId: string,
  tenantReference: string,
  input: WorkflowUpdateInput
): Promise<PersistedWorkflow> {
  const identity = await resolveScopedIdentity(tenantReference);
  const existing = await getWorkflowById(workflowId, identity.tenantId);
  if (!existing) {
    throw new Error("WORKFLOW_NOT_FOUND");
  }

  if (input.canvas) {
    ensureCanvasIsDag(input.canvas);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const workflowUpdateData: Prisma.WorkflowUpdateInput = {};

    if (input.status === WorkflowStatus.ARCHIVED) {
      workflowUpdateData.archivedAt = new Date();
      workflowUpdateData.publishedAt = null;
      workflowUpdateData.status = WorkflowStatus.ARCHIVED;
    } else if (input.status === WorkflowStatus.PUBLISHED) {
      workflowUpdateData.archivedAt = null;
      workflowUpdateData.publishedAt = new Date();
      workflowUpdateData.status = WorkflowStatus.PUBLISHED;
    } else if (input.status === WorkflowStatus.DRAFT) {
      workflowUpdateData.archivedAt = null;
      workflowUpdateData.publishedAt = null;
      workflowUpdateData.status = WorkflowStatus.DRAFT;
    }

    if (input.cronExpression !== undefined) {
      workflowUpdateData.cronExpression = input.cronExpression;
    }

    if (input.canvas !== undefined) {
      workflowUpdateData.definition = input.canvas as Prisma.InputJsonValue;
    }

    if (input.description !== undefined) {
      workflowUpdateData.description = input.description;
    }

    if (input.eventTopic !== undefined) {
      workflowUpdateData.eventTopic = input.eventTopic;
    }

    if (input.maxDepth !== undefined) {
      workflowUpdateData.maxDepth = input.maxDepth;
    }

    if (input.name !== undefined) {
      workflowUpdateData.name = input.name;
    }

    if (input.triggerConfig !== undefined) {
      workflowUpdateData.triggerConfig = input.triggerConfig as Prisma.InputJsonValue;
    }

    if (input.triggerType !== undefined) {
      workflowUpdateData.triggerType = input.triggerType;
    }

    const workflow = await tx.workflow.update({
      data: workflowUpdateData,
      where: {
        id: workflowId
      }
    });

    if (input.canvas) {
      await tx.workflowTransition.deleteMany({
        where: {
          workflowId
        }
      });
      await tx.workflowStep.deleteMany({
        where: {
          workflowId
        }
      });
      await persistCanvas(tx, identity, workflowId, input.canvas);
    }

    return workflow;
  });

  if ((input.triggerType ?? existing.triggerType) === WorkflowTriggerType.CRON) {
    await upsertCronTrigger(config, {
      cronExpression: updated.cronExpression,
      id: updated.id,
      organizationId: updated.organizationId,
      tenantId: updated.tenantId
    });
  }

  const persisted = await getWorkflowById(workflowId, identity.tenantId);
  if (!persisted) {
    throw new Error("WORKFLOW_NOT_FOUND_AFTER_UPDATE");
  }

  return persisted;
}

export async function archiveWorkflow(
  workflowId: string,
  tenantReference: string
): Promise<void> {
  const identity = await resolveScopedIdentity(tenantReference);
  await prisma.workflow.updateMany({
    data: {
      archivedAt: new Date(),
      status: WorkflowStatus.ARCHIVED
    },
    where: {
      id: workflowId,
      tenantId: identity.tenantId
    }
  });
}

export async function runWorkflowNow(
  config: ApiConfig,
  workflowId: string,
  tenantReference: string,
  input: WorkflowRunInput,
  triggerType: WorkflowTriggerType = WorkflowTriggerType.MANUAL
): Promise<{
  executionId: string;
  mode: "async" | "sync";
  status: "accepted";
}> {
  const identity = await resolveScopedIdentity(tenantReference);
  const workflow = await getWorkflowById(workflowId, identity.tenantId);
  if (!workflow) {
    throw new Error("WORKFLOW_NOT_FOUND");
  }

  if (workflow.status !== WorkflowStatus.PUBLISHED) {
    throw new Error("WORKFLOW_NOT_PUBLISHED");
  }

  const triggerStep = workflow.steps.find(
    (step) =>
      step.type === "TRIGGER_WEBHOOK" ||
      step.type === "TRIGGER_CRON" ||
      step.type === "TRIGGER_EVENT"
  );

  const execution = await prisma.workflowExecution.create({
    data: {
      organizationId: workflow.organizationId,
      status: WorkflowExecutionStatus.RUNNING,
      tenantId: workflow.tenantId,
      triggerPayload: input.payload as Prisma.InputJsonValue,
      triggerType,
      workflowId: workflow.id
    }
  });

  if (triggerStep) {
    await enqueueWorkflowExecution(config, {
      attempt: 1,
      executionId: execution.id,
      organizationId: workflow.organizationId,
      stepKey: triggerStep.key,
      tenantId: workflow.tenantId,
      triggerPayload: input.payload,
      triggerType,
      workflowId: workflow.id
    });
  } else {
    await enqueueWorkflowTrigger(config, {
      organizationId: workflow.organizationId,
      tenantId: workflow.tenantId,
      triggerPayload: input.payload,
      triggerType,
      workflowId: workflow.id
    });
  }

  return {
    executionId: execution.id,
    mode: input.async ? "async" : "sync",
    status: "accepted"
  };
}
