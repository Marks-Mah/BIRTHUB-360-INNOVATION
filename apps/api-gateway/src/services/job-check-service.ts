import { Queue } from "bullmq";
import * as QueuePackage from "@birthub/queue";
import { AlertService } from "./alert-service.js";

type AlertLevel = "info" | "warning" | "critical";

type AlertSender = Pick<AlertService, "sendAlert">;

type QueueName = "LEAD_ENRICHMENT" | "DEAL_CLOSED_WON";

const VALID_QUEUE_NAMES: QueueName[] = ["LEAD_ENRICHMENT", "DEAL_CLOSED_WON"];

const createQueue = (QueuePackage as { createQueue: (name: string) => QueueLike }).createQueue;
type QueueFactory = (queueName: QueueName) => QueueLike;

type QueueLike = Pick<Queue, "getJobCountByTypes" | "getFailed" | "close" | "getJob">;

type JobLike = {
  getState: () => Promise<string>;
  remove: () => Promise<void>;
  retry?: () => Promise<unknown>;
};

export type CancelJobStatus =
  | "cancelled"
  | "not_found"
  | "active_not_cancellable"
  | "already_finalized";

const CANCELLABLE_JOB_STATES = new Set(["waiting", "delayed", "prioritized", "paused"]);
const ACTIVE_STATE = "active";
const CRITICAL_QUEUES: QueueName[] = ["LEAD_ENRICHMENT", "DEAL_CLOSED_WON"];

export class InvalidQueueNameError extends Error {
  constructor(queueName: string) {
    super(`Invalid queue name: ${queueName}`);
    this.name = "InvalidQueueNameError";
  }
}

const parseQueueName = (queueName: string): QueueName => {
  if (!VALID_QUEUE_NAMES.includes(queueName as QueueName)) {
    throw new InvalidQueueNameError(queueName);
  }

  return queueName as QueueName;
};

export class JobCheckService {
  constructor(
    private readonly alertService: AlertSender,
    private readonly queueFactory: QueueFactory = (queueName: QueueName) => createQueue(queueName) as QueueLike,
  ) {}

  async checkFailedJobs() {
    const results: Array<{ queue: QueueName; status: "ok" | "alerted"; failedCount: number }> = [];

    for (const queueName of CRITICAL_QUEUES) {
      const queue = this.queueFactory(queueName);
      try {
        const failedCount = await queue.getJobCountByTypes("failed");
        if (failedCount > 0) {
          await this.sendJobFailureAlert(queueName, failedCount);
          results.push({ queue: queueName, status: "alerted", failedCount });
        } else {
          results.push({ queue: queueName, status: "ok", failedCount });
        }
      } finally {
        await queue.close();
      }
    }

    return results;
  }

  async retryFailedJobs(queueName: string) {
    const parsedQueue = parseQueueName(queueName);
    const queue = this.queueFactory(parsedQueue);

    try {
      const failed = await queue.getFailed();
      let retried = 0;
      for (const job of failed as JobLike[]) {
        if (!job.retry) continue;
        await job.retry();
        retried += 1;
      }
      return { retried };
    } finally {
      await queue.close();
    }
  }

  async cancelJobExecution(input: { queueName: string; jobId: string; traceId?: string }) {
    const parsedQueue = parseQueueName(input.queueName);
    const queue = this.queueFactory(parsedQueue);

    try {
      const job = (await queue.getJob(input.jobId)) as JobLike | null;

      if (!job) {
        this.logCancellationEvent({
          event: "admin.job.cancel.skipped",
          queue: parsedQueue,
          jobId: input.jobId,
          traceId: input.traceId,
          reason: "not_found",
        });

        return {
          cancelled: false,
          status: "not_found" as const,
          jobId: input.jobId,
          queue: parsedQueue,
          idempotent: true,
        };
      }

      const state = await job.getState();
      if (CANCELLABLE_JOB_STATES.has(state)) {
        await job.remove();
        this.logCancellationEvent({
          event: "admin.job.cancelled",
          queue: parsedQueue,
          jobId: input.jobId,
          traceId: input.traceId,
          previousState: state,
        });

        return {
          cancelled: true,
          status: "cancelled" as const,
          previousState: state,
          jobId: input.jobId,
          queue: parsedQueue,
        };
      }

      const status: CancelJobStatus = state === ACTIVE_STATE ? "active_not_cancellable" : "already_finalized";
      this.logCancellationEvent({
        event: "admin.job.cancel.skipped",
        queue: parsedQueue,
        jobId: input.jobId,
        traceId: input.traceId,
        reason: status,
        currentState: state,
      });

      return {
        cancelled: false,
        status,
        currentState: state,
        jobId: input.jobId,
        queue: parsedQueue,
        idempotent: true,
      };
    } finally {
      await queue.close();
    }
  }

  private async sendJobFailureAlert(queueName: QueueName, failedCount: number) {
    const title = "Job Failure Alert";
    const message = `Queue ${queueName} has ${failedCount} failed jobs.`;
    const severity: AlertLevel = "critical";
    await this.alertService.sendAlert(title, message, severity);
  }

  private logCancellationEvent(payload: {
    event: "admin.job.cancelled" | "admin.job.cancel.skipped";
    queue: QueueName;
    jobId: string;
    traceId?: string;
    reason?: Exclude<CancelJobStatus, "cancelled">;
    currentState?: string;
    previousState?: string;
  }) {
    console.info(JSON.stringify({
      event: payload.event,
      queue: payload.queue,
      job_id: payload.jobId,
      reason: payload.reason,
      current_state: payload.currentState,
      previous_state: payload.previousState,
      trace_id: payload.traceId ?? null,
    }));
  }
}
