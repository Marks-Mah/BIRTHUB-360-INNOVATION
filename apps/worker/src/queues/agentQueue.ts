import { Queue, type JobsOptions } from "bullmq";
import type { Redis } from "ioredis";

export type AgentQueuePriority = "high" | "low" | "normal";

const QUEUE_BY_PRIORITY: Record<AgentQueuePriority, string> = {
  high: "agent-high",
  low: "agent-low",
  normal: "agent-normal"
};

function mapPriority(priority: AgentQueuePriority): number {
  switch (priority) {
    case "high":
      return 1;
    case "normal":
      return 5;
    case "low":
      return 10;
    default:
      return 5;
  }
}

export interface AgentQueuePayload {
  executionId: string;
  tenantId: string;
  agentId: string;
  input: Record<string, unknown>;
  priority?: AgentQueuePriority;
  toolCalls?: Array<{
    tool: string;
    input: unknown;
  }>;
}

export class AgentQueueRouter {
  private readonly queues = new Map<string, Queue<AgentQueuePayload>>();

  constructor(private readonly connection: Redis) {}

  getQueue(priority: AgentQueuePriority): Queue<AgentQueuePayload> {
    const queueName = QUEUE_BY_PRIORITY[priority];
    const existing = this.queues.get(queueName);
    if (existing) {
      return existing;
    }

    const queue = new Queue<AgentQueuePayload>(queueName, {
      connection: this.connection as never,
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
          count: 1000
        }
      }
    });

    const typedQueue = queue as Queue<AgentQueuePayload>;
    this.queues.set(queueName, typedQueue);
    return typedQueue;
  }

  async enqueue(payload: AgentQueuePayload, options?: JobsOptions): Promise<void> {
    const priority = payload.priority ?? "normal";
    const queue = this.getQueue(priority);
    await queue.add("agent-execution", payload, {
      ...options,
      jobId: `${payload.tenantId}:${payload.executionId}`,
      priority: mapPriority(priority)
    });
  }

  async close(): Promise<void> {
    await Promise.all(Array.from(this.queues.values()).map((queue) => queue.close()));
    this.queues.clear();
  }
}

export function getQueueNameForPriority(priority: AgentQueuePriority): string {
  return QUEUE_BY_PRIORITY[priority];
}
