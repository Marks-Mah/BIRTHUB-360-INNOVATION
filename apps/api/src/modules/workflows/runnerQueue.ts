import { createHash } from "node:crypto";

import type { ApiConfig } from "@birthub/config";
import type { WorkflowTriggerType } from "@birthub/database";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

const WORKFLOW_QUEUE_NAME = "workflow-execution";
const WORKFLOW_TRIGGER_QUEUE_NAME = "workflow-trigger";

let redisConnection: Redis | null = null;
let executionQueue: Queue | null = null;
let triggerQueue: Queue | null = null;

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

function getRedisConnection(config: ApiConfig): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null
    });
  }

  return redisConnection;
}

function getExecutionQueue(config: ApiConfig): Queue {
  if (!executionQueue) {
    executionQueue = new Queue(WORKFLOW_QUEUE_NAME, {
      connection: getRedisConnection(config) as any,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          delay: 1000,
          type: "exponential"
        },
        removeOnComplete: {
          count: 500
        },
        removeOnFail: {
          count: 500
        }
      }
    });
  }

  return executionQueue;
}

function getTriggerQueue(config: ApiConfig): Queue {
  if (!triggerQueue) {
    triggerQueue = new Queue(WORKFLOW_TRIGGER_QUEUE_NAME, {
      connection: getRedisConnection(config) as any,
      defaultJobOptions: {
        removeOnComplete: {
          count: 500
        },
        removeOnFail: {
          count: 500
        }
      }
    });
  }

  return triggerQueue;
}

export async function enqueueWorkflowExecution(
  config: ApiConfig,
  payload: WorkflowExecutionJobPayload,
  options?: {
    delay?: number;
    jobId?: string;
  }
): Promise<void> {
  const jobOptions: Record<string, unknown> = {
    jobId: options?.jobId ?? `${payload.executionId}:${payload.stepKey}:${payload.attempt}`
  };

  if (options?.delay !== undefined) {
    jobOptions.delay = options.delay;
  }

  await getExecutionQueue(config).add("workflow-step", payload, jobOptions as any);
}

export async function enqueueWorkflowTrigger(
  config: ApiConfig,
  payload: WorkflowTriggerJobPayload
): Promise<void> {
  await getTriggerQueue(config).add("workflow-trigger", payload, {
    jobId: `${payload.workflowId}:${Date.now()}`
  });
}

export async function scheduleCronWorkflow(
  config: ApiConfig,
  payload: WorkflowTriggerJobPayload & { cron: string }
): Promise<void> {
  await getTriggerQueue(config).add("workflow-trigger-cron", payload, {
    jobId: `cron:${payload.workflowId}`,
    repeat: {
      pattern: payload.cron
    }
  });
}

export async function dedupeTriggerPayload(
  config: ApiConfig,
  tenantId: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const hash = createHash("sha256")
    .update(JSON.stringify({ payload, tenantId }))
    .digest("hex");
  const key = `workflow:trigger:dedupe:${tenantId}:${hash}`;
  const result = await getRedisConnection(config).set(key, "1", "EX", 5, "NX");
  return result === "OK";
}
