import { createHash } from "node:crypto";

import {
  Prisma,
  prisma,
  QuotaResourceType,
  StepResultStatus,
  WorkflowExecutionStatus,
  WorkflowStepOnError,
  WorkflowTransitionRoute,
  WorkflowTriggerType
} from "@birthub/database";
import { createLogger } from "@birthub/logger";
import {
  type AgentExecutor,
  type NotificationDispatcher,
  executeStep,
  stepSchema
} from "@birthub/workflows-core";
import { Queue } from "bullmq";

const logger = createLogger("workflow-runner");

const OUTPUT_MAX_BYTES = 200 * 1024;
const MAX_ATTEMPTS = 5;
const WORKFLOW_EXECUTION_QUEUE = "workflow-execution";

export interface WorkflowExecutionJobPayload {
  attempt: number;
  executionId: string;
  organizationId: string;
  stepKey: string;
  tenantId: string;
  triggerPayload: Record<string, unknown>;
  triggerType: WorkflowTriggerType;
  workflowId: string;
}

export interface WorkflowTriggerJobPayload {
  organizationId: string;
  tenantId: string;
  triggerPayload: Record<string, unknown>;
  triggerType: WorkflowTriggerType;
  workflowId: string;
}

type StepOutputEnvelope = {
  externalPayloadUrl: string | null;
  output: unknown;
  outputPreview: string | null;
  outputSize: number;
};

function normalizeOutput(output: unknown, executionId: string, stepKey: string): StepOutputEnvelope {
  const serialized = JSON.stringify(output ?? null);
  const outputSize = Buffer.byteLength(serialized, "utf8");

  if (outputSize <= OUTPUT_MAX_BYTES) {
    return {
      externalPayloadUrl: null,
      output,
      outputPreview: null,
      outputSize
    };
  }

  const externalPayloadUrl = `s3://workflow-step-results/${executionId}/${stepKey}/${createHash("sha256")
    .update(serialized)
    .digest("hex")}.json`;

  return {
    externalPayloadUrl,
    output: null,
    outputPreview: `${serialized.slice(0, 1_500)}...`,
    outputSize
  };
}

function isConditionTrue(output: unknown): boolean {
  if (typeof output !== "object" || output === null) {
    return false;
  }

  return Boolean((output as { result?: unknown }).result);
}

export function shouldFollowTransition(
  route: WorkflowTransitionRoute,
  output: unknown,
  failed: boolean
): boolean {
  if (failed) {
    return route === WorkflowTransitionRoute.ON_FAILURE || route === WorkflowTransitionRoute.FALLBACK;
  }

  if (route === WorkflowTransitionRoute.ALWAYS || route === WorkflowTransitionRoute.ON_SUCCESS) {
    return true;
  }

  if (route === WorkflowTransitionRoute.IF_TRUE) {
    return isConditionTrue(output);
  }

  if (route === WorkflowTransitionRoute.IF_FALSE) {
    return !isConditionTrue(output);
  }

  return false;
}

export function calculateBackoff(attempt: number): number {
  return Math.min(60_000, Math.pow(2, attempt) * 1000);
}

async function consumeSharedAgentBudget(tenantId: string): Promise<void> {
  const record = await prisma.quotaUsage.findFirst({
    orderBy: {
      resetAt: "desc"
    },
    where: {
      resourceType: QuotaResourceType.AI_PROMPTS,
      tenantId
    }
  });

  if (!record) {
    return;
  }

  if (record.count >= record.limit) {
    throw new Error("SHARED_RATE_LIMIT_EXCEEDED");
  }

  await prisma.quotaUsage.update({
    data: {
      count: {
        increment: 1
      }
    },
    where: {
      id: record.id
    }
  });
}

export class WorkflowRunner {
  private readonly executionQueue: Queue<WorkflowExecutionJobPayload>;
  private readonly dependencies: {
    agentExecutor?: AgentExecutor;
    notificationDispatcher?: NotificationDispatcher;
    httpRequestRateLimiter?: { consume: (key: string, limit: number, windowSeconds: number) => Promise<void> };
  };

  constructor(
    executionQueueConnection: Queue<WorkflowExecutionJobPayload>,
    dependencies: {
      agentExecutor?: AgentExecutor;
      notificationDispatcher?: NotificationDispatcher;
      httpRequestRateLimiter?: { consume: (key: string, limit: number, windowSeconds: number) => Promise<void> };
    } = {}
  ) {
    this.executionQueue = executionQueueConnection;
    this.dependencies = dependencies;
  }

  async processTriggerJob(payload: WorkflowTriggerJobPayload): Promise<void> {
    const workflow = await prisma.workflow.findFirst({
      include: {
        steps: true
      },
      where: {
        id: payload.workflowId,
        status: "PUBLISHED",
        tenantId: payload.tenantId
      }
    });

    if (!workflow) {
      logger.warn({ payload }, "Workflow trigger dropped because workflow was not found/published");
      return;
    }

    const execution = await prisma.workflowExecution.create({
      data: {
        organizationId: payload.organizationId,
        status: WorkflowExecutionStatus.RUNNING,
        tenantId: payload.tenantId,
        triggerPayload: payload.triggerPayload as Prisma.InputJsonValue,
        triggerType: payload.triggerType,
        workflowId: workflow.id
      }
    });

    const triggerStep = workflow.steps.find(
      (step) =>
        step.type === "TRIGGER_CRON" ||
        step.type === "TRIGGER_EVENT" ||
        step.type === "TRIGGER_WEBHOOK"
    );

    if (!triggerStep) {
      await prisma.workflowExecution.update({
        data: {
          completedAt: new Date(),
          errorMessage: "Workflow has no trigger step configured.",
          status: WorkflowExecutionStatus.FAILED
        },
        where: {
          id: execution.id
        }
      });
      return;
    }

    await this.executionQueue.add(
      "workflow-step",
      {
        attempt: 1,
        executionId: execution.id,
        organizationId: payload.organizationId,
        stepKey: triggerStep.key,
        tenantId: payload.tenantId,
        triggerPayload: payload.triggerPayload,
        triggerType: payload.triggerType,
        workflowId: payload.workflowId
      },
      {
        jobId: `${execution.id}:${triggerStep.key}:1`
      }
    );
  }

  async processExecutionJob(payload: WorkflowExecutionJobPayload): Promise<void> {
    const execution = await prisma.workflowExecution.findUnique({
      where: {
        id: payload.executionId
      }
    });

    if (!execution || execution.status === WorkflowExecutionStatus.CANCELLED) {
      return;
    }

    const workflow = await prisma.workflow.findFirst({
      include: {
        steps: true,
        transitions: true
      },
      where: {
        id: payload.workflowId,
        tenantId: payload.tenantId
      }
    });

    if (!workflow) {
      await prisma.workflowExecution.update({
        data: {
          completedAt: new Date(),
          errorMessage: "Workflow definition not found during execution.",
          status: WorkflowExecutionStatus.FAILED
        },
        where: {
          id: payload.executionId
        }
      });
      return;
    }

    const maxDepth = Math.max(1, workflow.maxDepth);
    if (execution.depth >= maxDepth) {
      await prisma.workflowExecution.update({
        data: {
          completedAt: new Date(),
          errorMessage: `Execution reached max_depth=${maxDepth}.`,
          status: WorkflowExecutionStatus.FAILED
        },
        where: {
          id: payload.executionId
        }
      });
      return;
    }

    const step = workflow.steps.find((candidate) => candidate.key === payload.stepKey);
    if (!step) {
      await prisma.workflowExecution.update({
        data: {
          completedAt: new Date(),
          errorMessage: `Step '${payload.stepKey}' not found in workflow.`,
          status: WorkflowExecutionStatus.FAILED
        },
        where: {
          id: payload.executionId
        }
      });
      return;
    }

    const previousResults = await prisma.stepResult.findMany({
      include: {
        step: true
      },
      orderBy: {
        createdAt: "asc"
      },
      where: {
        executionId: payload.executionId
      }
    });

    const stepsContext = Object.fromEntries(
      previousResults.map((result) => [
        result.step.key,
        {
          input: result.input,
          output: result.output,
          status: result.status as "FAILED" | "SKIPPED" | "SUCCESS" | "WAITING"
        }
      ])
    );

    const parsedStep = stepSchema.parse({
      config: step.config,
      ...(step.isTrigger ? { isTrigger: step.isTrigger } : {}),
      key: step.key,
      name: step.name,
      type: step.type
    });

    const now = new Date();
    const stepInputHash = createHash("sha256")
      .update(
        JSON.stringify({
          stepKey: step.key,
          stepsContext,
          triggerPayload: payload.triggerPayload
        })
      )
      .digest("hex");

    try {
      let output: unknown;
      const cacheTTLSeconds = step.cacheTTLSeconds ?? 0;

      if (
        cacheTTLSeconds > 0 &&
        (step.type === "AGENT_EXECUTE" || step.type === "HTTP_REQUEST")
      ) {
        const cacheCandidates = await prisma.stepResult.findMany({
          orderBy: {
            finishedAt: "desc"
          },
          take: 10,
          where: {
            finishedAt: {
              gte: new Date(Date.now() - cacheTTLSeconds * 1000)
            },
            status: StepResultStatus.SUCCESS,
            stepId: step.id,
            workflowId: payload.workflowId
          }
        });

        const cacheHit = cacheCandidates.find((candidate) => {
          if (typeof candidate.input !== "object" || candidate.input === null) {
            return false;
          }

          return (
            (candidate.input as { _cacheHash?: unknown })._cacheHash === stepInputHash &&
            candidate.output !== null
          );
        });

        if (cacheHit) {
          output = cacheHit.output;
        }
      }

      if (output === undefined) {
        if (step.type === "AGENT_EXECUTE") {
          await consumeSharedAgentBudget(payload.tenantId);
        }

        output = await executeStep(
          parsedStep,
          {
            executionId: payload.executionId,
            steps: stepsContext,
            tenantId: payload.tenantId,
            trigger: {
              output: payload.triggerPayload,
              type: payload.triggerType
            },
            workflowId: payload.workflowId
          },
          this.dependencies
        );
      }

      const normalizedOutput = normalizeOutput(output, payload.executionId, step.key);
      const isDelayStep = step.type === "DELAY";

      await prisma.stepResult.create({
        data: {
          attempt: payload.attempt,
          executionId: payload.executionId,
          externalPayloadUrl: normalizedOutput.externalPayloadUrl,
          finishedAt: now,
          input: {
            _cacheHash: stepInputHash,
            triggerPayload: payload.triggerPayload
          } as Prisma.InputJsonValue,
          organizationId: payload.organizationId,
          output: normalizedOutput.output as Prisma.InputJsonValue,
          outputPreview: normalizedOutput.outputPreview,
          outputSize: normalizedOutput.outputSize,
          startedAt: now,
          status: isDelayStep ? StepResultStatus.WAITING : StepResultStatus.SUCCESS,
          stepId: step.id,
          tenantId: payload.tenantId,
          workflowId: payload.workflowId
        }
      });

      await prisma.workflowExecution.update({
        data: {
          depth: execution.depth + 1
        },
        where: {
          id: payload.executionId
        }
      });

      const nextTransitions = workflow.transitions.filter((transition) => {
        if (transition.sourceStepId !== step.id) {
          return false;
        }

        return shouldFollowTransition(transition.route, output, false);
      });

      if (nextTransitions.length === 0) {
        await prisma.workflowExecution.update({
          data: {
            completedAt: new Date(),
            durationMs: Date.now() - execution.startedAt.getTime(),
            status: WorkflowExecutionStatus.SUCCESS
          },
          where: {
            id: payload.executionId
          }
        });
        return;
      }

      for (const transition of nextTransitions) {
        const nextStep = workflow.steps.find(
          (candidate) => candidate.id === transition.targetStepId
        );

        if (!nextStep) {
          continue;
        }

        let delay = 0;
        if (step.type === "DELAY") {
          const delayMs = Number(
            (output as { delayMs?: unknown })?.delayMs ?? (step.config as { duration_ms?: unknown }).duration_ms
          );
          delay = Number.isFinite(delayMs) ? Math.max(0, delayMs) : 0;
        }

        await this.executionQueue.add(
          "workflow-step",
          {
            attempt: 1,
            executionId: payload.executionId,
            organizationId: payload.organizationId,
            stepKey: nextStep.key,
            tenantId: payload.tenantId,
            triggerPayload: payload.triggerPayload,
            triggerType: payload.triggerType,
            workflowId: payload.workflowId
          },
          {
            delay,
            jobId: `${payload.executionId}:${nextStep.key}:${Date.now()}`
          }
        );
      }
    } catch (error) {
      await prisma.stepResult.create({
        data: {
          attempt: payload.attempt,
          errorMessage: error instanceof Error ? error.message : "Unknown step execution error",
          executionId: payload.executionId,
          finishedAt: now,
          input: {
            _cacheHash: stepInputHash,
            triggerPayload: payload.triggerPayload
          } as Prisma.InputJsonValue,
          organizationId: payload.organizationId,
          outputSize: 0,
          startedAt: now,
          status: StepResultStatus.FAILED,
          stepId: step.id,
          tenantId: payload.tenantId,
          workflowId: payload.workflowId
        }
      });

      if (payload.attempt < MAX_ATTEMPTS) {
        await this.executionQueue.add(
          "workflow-step",
          {
            ...payload,
            attempt: payload.attempt + 1
          },
          {
            delay: calculateBackoff(payload.attempt),
            jobId: `${payload.executionId}:${payload.stepKey}:${payload.attempt + 1}`
          }
        );
        return;
      }

      if (step.onError === WorkflowStepOnError.CONTINUE) {
        const fallbackTransitions = workflow.transitions.filter((transition) => {
          if (transition.sourceStepId !== step.id) {
            return false;
          }

          return shouldFollowTransition(transition.route, null, true);
        });

        for (const transition of fallbackTransitions) {
          const nextStep = workflow.steps.find(
            (candidate) => candidate.id === transition.targetStepId
          );

          if (!nextStep) {
            continue;
          }

          await this.executionQueue.add(
            "workflow-step",
            {
              attempt: 1,
              executionId: payload.executionId,
              organizationId: payload.organizationId,
              stepKey: nextStep.key,
              tenantId: payload.tenantId,
              triggerPayload: payload.triggerPayload,
              triggerType: payload.triggerType,
              workflowId: payload.workflowId
            },
            {
              jobId: `${payload.executionId}:${nextStep.key}:${Date.now()}`
            }
          );
        }

        if (fallbackTransitions.length > 0) {
          return;
        }
      }

      await prisma.workflowExecution.update({
        data: {
          completedAt: new Date(),
          durationMs: Date.now() - execution.startedAt.getTime(),
          errorMessage: error instanceof Error ? error.message : "Workflow execution failed",
          status: WorkflowExecutionStatus.FAILED
        },
        where: {
          id: payload.executionId
        }
      });
    }
  }
}

export function createWorkflowExecutionQueue(connection: Queue<WorkflowExecutionJobPayload>): Queue<WorkflowExecutionJobPayload> {
  return connection;
}

export const workflowQueueNames = {
  execution: WORKFLOW_EXECUTION_QUEUE,
  trigger: "workflow-trigger"
} as const;
