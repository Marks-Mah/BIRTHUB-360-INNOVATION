import type { ApiConfig } from "@birthub/config";
import { Queue } from "bullmq";

import {
  QueueBackpressureError,
  TenantQueueRateLimitError
} from "../../lib/queue.js";
import { getBullConnection, getSharedRedis } from "../../lib/redis.js";

export type AgentExecutionJob = {
  agentId: string;
  catalogAgentId?: string | null;
  executionId: string;
  input: Record<string, unknown>;
  organizationId?: string | null;
  tenantId: string;
  userId?: string | null;
};

type AgentExecutionQueue = Queue<AgentExecutionJob>;

const queueCache = new Map<string, AgentExecutionQueue>();
const queueName = "agent-normal";

function getAgentExecutionQueue(config: ApiConfig): AgentExecutionQueue {
  const cacheKey = `${config.REDIS_URL}:${queueName}`;
  const existing = queueCache.get(cacheKey);

  if (existing) {
    return existing;
  }

  const queue = new Queue<AgentExecutionJob>(queueName, {
    connection: getBullConnection(config),
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        delay: 1_000,
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

  queueCache.set(cacheKey, queue);
  return queue;
}

async function assertTenantQueueRateLimit(config: ApiConfig, tenantId: string): Promise<void> {
  const redis = getSharedRedis(config);
  const key = `tenant-agent-queue-rate:${tenantId}`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, config.TENANT_QUEUE_RATE_LIMIT_WINDOW_SECONDS);
  }

  if (current > config.TENANT_QUEUE_RATE_LIMIT_MAX) {
    throw new TenantQueueRateLimitError(tenantId, config.TENANT_QUEUE_RATE_LIMIT_MAX);
  }
}

export async function getInstalledAgentQueueStats(config: ApiConfig): Promise<{
  active: number;
  completed: number;
  delayed: number;
  failed: number;
  pending: number;
  prioritized: number;
  queueName: string;
  waiting: number;
}> {
  const queue = getAgentExecutionQueue(config);
  const [waiting, delayed, prioritized, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getDelayedCount(),
    queue.getPrioritizedCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount()
  ]);

  return {
    active,
    completed,
    delayed,
    failed,
    pending: waiting + delayed + prioritized,
    prioritized,
    queueName,
    waiting
  };
}

export async function enqueueInstalledAgentExecution(
  config: ApiConfig,
  payload: AgentExecutionJob
): Promise<{
  jobId: string;
  pendingJobs: number;
}> {
  await assertTenantQueueRateLimit(config, payload.tenantId);
  const queue = getAgentExecutionQueue(config);
  const stats = await getInstalledAgentQueueStats(config);

  if (stats.pending >= config.QUEUE_BACKPRESSURE_THRESHOLD) {
    throw new QueueBackpressureError(stats.pending, config.QUEUE_BACKPRESSURE_THRESHOLD);
  }

  const job = await queue.add("agent-execution", payload, {
    jobId: `${payload.tenantId}:${payload.executionId}`,
    priority: 5
  });

  return {
    jobId: String(job.id),
    pendingJobs: stats.pending + 1
  };
}
