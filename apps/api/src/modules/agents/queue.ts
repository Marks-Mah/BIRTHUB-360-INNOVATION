import type { ApiConfig } from "@birthub/config";
import { Queue } from "bullmq";

import { getBullConnection } from "../../lib/redis.js";

type AgentExecutionJob = {
  agentId: string;
  catalogAgentId?: string | null;
  executionId: string;
  input: Record<string, unknown>;
  organizationId?: string | null;
  tenantId: string;
  userId?: string | null;
};

const queueCache = new Map<string, Queue<AgentExecutionJob>>();
const queueName = "agent-normal";

function getAgentExecutionQueue(config: ApiConfig): Queue<AgentExecutionJob> {
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

  queueCache.set(cacheKey, queue);
  return queue;
}

export async function enqueueInstalledAgentExecution(
  config: ApiConfig,
  payload: AgentExecutionJob
): Promise<void> {
  await getAgentExecutionQueue(config).add("agent-execution", payload, {
    jobId: `${payload.tenantId}:${payload.executionId}`,
    priority: 5
  });
}
