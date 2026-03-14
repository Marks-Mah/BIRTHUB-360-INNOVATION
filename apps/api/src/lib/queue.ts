import type { ApiConfig } from "@birthub/config";
import { taskJobSchema } from "@birthub/config";
import { Queue } from "bullmq";
import { z } from "zod";

import { getBullConnection, getSharedRedis } from "./redis.js";

type TaskJob = z.infer<typeof taskJobSchema>;
type TaskQueue = Queue<TaskJob, void, TaskJob["type"]>;

const queueCache = new Map<string, TaskQueue>();

export class QueueBackpressureError extends Error {
  readonly pendingJobs: number;
  readonly threshold: number;

  constructor(pendingJobs: number, threshold: number) {
    super(`Queue backlog is ${pendingJobs} jobs (threshold ${threshold}).`);
    this.name = "QueueBackpressureError";
    this.pendingJobs = pendingJobs;
    this.threshold = threshold;
  }
}

export class TenantQueueRateLimitError extends Error {
  readonly tenantId: string;
  readonly threshold: number;

  constructor(tenantId: string, threshold: number) {
    super(`Tenant ${tenantId} exceeded the queue rate limit (${threshold}).`);
    this.name = "TenantQueueRateLimitError";
    this.tenantId = tenantId;
    this.threshold = threshold;
  }
}

export function getTaskQueue(config: ApiConfig): TaskQueue {
  const existingQueue = queueCache.get(config.QUEUE_NAME);

  if (existingQueue) {
    return existingQueue;
  }

  const queue = new Queue<TaskJob, void, TaskJob["type"]>(config.QUEUE_NAME, {
    connection: getBullConnection(config)
  });

  queueCache.set(config.QUEUE_NAME, queue);
  return queue;
}

async function assertTenantQueueRateLimit(config: ApiConfig, tenantId: string | null): Promise<void> {
  if (!tenantId) {
    return;
  }

  const redis = getSharedRedis(config);
  const key = `tenant-queue-rate:${tenantId}`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, config.TENANT_QUEUE_RATE_LIMIT_WINDOW_SECONDS);
  }

  if (current > config.TENANT_QUEUE_RATE_LIMIT_MAX) {
    throw new TenantQueueRateLimitError(tenantId, config.TENANT_QUEUE_RATE_LIMIT_MAX);
  }
}

export async function enqueueTask(config: ApiConfig, payload: TaskJob): Promise<{ jobId: string }> {
  const validated = taskJobSchema.parse(payload);
  await assertTenantQueueRateLimit(config, validated.tenantId);
  const queue = getTaskQueue(config);
  const [waitingCount, delayedCount, prioritizedCount] = await Promise.all([
    queue.getWaitingCount(),
    queue.getDelayedCount(),
    queue.getPrioritizedCount()
  ]);
  const pendingJobs = waitingCount + delayedCount + prioritizedCount;

  if (pendingJobs >= config.QUEUE_BACKPRESSURE_THRESHOLD) {
    throw new QueueBackpressureError(pendingJobs, config.QUEUE_BACKPRESSURE_THRESHOLD);
  }

  const job = await queue.add(validated.type, validated, {
    removeOnComplete: 100,
    removeOnFail: 500
  });

  return {
    jobId: String(job.id)
  };
}

export async function pingRedis(config: ApiConfig): Promise<{ status: "up" | "down"; message?: string }> {
  try {
    const pong = await getSharedRedis(config).ping();
    return {
      status: pong === "PONG" ? "up" : "down"
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Unknown Redis error",
      status: "down"
    };
  }
}
