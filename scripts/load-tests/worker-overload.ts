import { Queue } from "bullmq";
import { Redis } from "ioredis";

type OverloadSummary = {
  apiFailures: number;
  durationMs: number;
  enqueuedJobs: number;
  finalActive: number;
  finalWaiting: number;
  maxPending: number;
};

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const QUEUE_NAME = process.env.QUEUE_NAME ?? "birthub-cycle1";
const API_HEALTH_URL = process.env.API_HEALTH_URL ?? "http://localhost:3000/api/v1/health";
const JOBS_TO_ENQUEUE = Number(process.env.OVERLOAD_JOBS ?? "5000");
const CHUNK_SIZE = Number(process.env.OVERLOAD_CHUNK_SIZE ?? "250");
const MAX_WAIT_MS = Number(process.env.OVERLOAD_MAX_WAIT_MS ?? "600000");
const POLL_INTERVAL_MS = Number(process.env.OVERLOAD_POLL_INTERVAL_MS ?? "5000");

function createJobPayload(index: number) {
  return {
    agentId: "ceo-pack",
    approvalRequired: false,
    estimatedCostBRL: 0.0,
    executionMode: "DRY_RUN" as const,
    payload: {
      index,
      source: "worker-overload-test"
    },
    requestId: `overload-${Date.now()}-${index}`,
    signature: `sig-${index}`,
    tenantId: "tenant-overload",
    type: "sync-session" as const,
    userId: "worker-overload",
    version: "1" as const
  };
}

async function probeApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(API_HEALTH_URL);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForDrain(queue: Queue, startedAt: number): Promise<OverloadSummary> {
  let maxPending = 0;
  let apiFailures = 0;

  while (Date.now() - startedAt < MAX_WAIT_MS) {
    const healthOk = await probeApiHealth();
    if (!healthOk) {
      apiFailures += 1;
    }

    const counts = await queue.getJobCounts("waiting", "active");
    const pending = (counts.waiting ?? 0) + (counts.active ?? 0);
    maxPending = Math.max(maxPending, pending);

    if (pending === 0) {
      return {
        apiFailures,
        durationMs: Date.now() - startedAt,
        enqueuedJobs: JOBS_TO_ENQUEUE,
        finalActive: counts.active ?? 0,
        finalWaiting: counts.waiting ?? 0,
        maxPending
      };
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  const finalCounts = await queue.getJobCounts("waiting", "active");
  return {
    apiFailures,
    durationMs: Date.now() - startedAt,
    enqueuedJobs: JOBS_TO_ENQUEUE,
    finalActive: finalCounts.active ?? 0,
    finalWaiting: finalCounts.waiting ?? 0,
    maxPending
  };
}

async function main(): Promise<void> {
  const connection = new Redis(REDIS_URL, {
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null
  });
  connection.on("error", () => {
    // connection errors are handled in the main promise flow
  });
  const startedAt = Date.now();
  let queue: Queue | null = null;

  try {
    await connection.ping();
    queue = new Queue(QUEUE_NAME, { connection });
    queue.on("error", () => {
      // queue-level errors are captured by the script exit code
    });
    console.log(
      `[worker-overload] starting: queue=${QUEUE_NAME} redis=${REDIS_URL} jobs=${JOBS_TO_ENQUEUE}`
    );

    for (let index = 0; index < JOBS_TO_ENQUEUE; index += CHUNK_SIZE) {
      const chunkEnd = Math.min(index + CHUNK_SIZE, JOBS_TO_ENQUEUE);
      const jobs = Array.from({ length: chunkEnd - index }, (_, offset) => {
        const absoluteIndex = index + offset;
        return {
          data: createJobPayload(absoluteIndex),
          name: "sync-session" as const
        };
      });

      await queue.addBulk(jobs);
    }

    const summary = await waitForDrain(queue, startedAt);
    console.log(`[worker-overload] summary=${JSON.stringify(summary)}`);

    if (summary.apiFailures > 0) {
      process.exitCode = 1;
      return;
    }

    if (summary.finalActive > 0 || summary.finalWaiting > 0) {
      process.exitCode = 1;
      return;
    }
  } finally {
    if (queue) {
      await queue.close();
    }
    await connection.quit();
  }
}

void main().catch((error) => {
  console.error(`[worker-overload] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
