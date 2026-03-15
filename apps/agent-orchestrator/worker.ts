import { createWorker } from "@birthub/queue";
import { QueueName } from "@birthub/shared-types";
import axios from "axios";
import dotenv from "dotenv";
import { Job } from "bullmq";

dotenv.config();

const DEFAULT_API_URL = process.env.ORCHESTRATOR_API_URL || "http://localhost:8000";
const DEFAULT_INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

export const QUEUE_TO_EVENT: Record<string, string> = {
  [QueueName.BOARD_REPORT]: "BOARD_REPORT",
  [QueueName.CHURN_RISK_HIGH]: "CHURN_RISK_HIGH",
  [QueueName.DEAL_CLOSED_WON]: "DEAL_CLOSED_WON",
  [QueueName.HEALTH_SCORE_UPDATE]: "HEALTH_ALERT"
};

type MinimalJob = Pick<Job, "data" | "id" | "opts">;

export function resolveEntityId(job: MinimalJob, eventType: string): string {
  if (eventType === "DEAL_CLOSED_WON") {
    return String(job.data.dealId || job.data.deal_id || job.data.entity_id || "unknown");
  }
  return String(job.data.customerId || job.data.customer_id || job.data.entity_id || "unknown");
}

export function buildOrchestratorEventPayload(queueName: string, job: MinimalJob) {
  const eventType = QUEUE_TO_EVENT[queueName];
  if (!eventType) {
    throw new Error(`No event mapping configured for queue ${queueName}`);
  }

  return {
    context: {
      job_id: job.id,
      priority: job.opts.priority ?? 0,
      queue: queueName,
      tenant_id: job.data.tenantId || job.data.tenant_id || null,
      ...job.data
    },
    entity_id: resolveEntityId(job, eventType),
    event_id: `${queueName}:${job.id}`,
    event_type: eventType
  };
}

export function createJobProcessor(
  queueName: string,
  options: {
    apiUrl?: string;
    httpClient?: { post: (url: string, payload: unknown, config?: { headers?: Record<string, string> }) => Promise<{ data: unknown }> };
    internalServiceToken?: string;
    log?: (...args: unknown[]) => void;
  } = {}
) {
  const apiUrl = options.apiUrl ?? DEFAULT_API_URL;
  const internalServiceToken = options.internalServiceToken ?? DEFAULT_INTERNAL_SERVICE_TOKEN;
  const httpClient = options.httpClient ?? axios;
  const log = options.log ?? console.log;

  return async (job: MinimalJob) => {
    const payload = buildOrchestratorEventPayload(queueName, job);
    const headers = internalServiceToken ? { "x-service-token": internalServiceToken } : undefined;

    log(`Processing job ${job.id} on ${queueName}`);
    const response = await httpClient.post(`${apiUrl}/events/run`, payload, { headers });
    log(`Job ${job.id} completed. Result:`, response.data);
    return response.data;
  };
}

export function startOrchestratorWorkers(options: {
  apiUrl?: string;
  httpClient?: { post: (url: string, payload: unknown, config?: { headers?: Record<string, string> }) => Promise<{ data: unknown }> };
  internalServiceToken?: string;
  log?: (...args: unknown[]) => void;
  workerFactory?: typeof createWorker;
} = {}) {
  const log = options.log ?? console.log;
  const workerFactory = options.workerFactory ?? createWorker;

  log("Starting Orchestrator Worker...");
  if ((options.internalServiceToken ?? DEFAULT_INTERNAL_SERVICE_TOKEN) ) {
    log("Internal service token is enabled for Orchestrator worker requests.");
  }

  const queues = [
    QueueName.DEAL_CLOSED_WON,
    QueueName.HEALTH_SCORE_UPDATE,
    QueueName.CHURN_RISK_HIGH,
    QueueName.BOARD_REPORT
  ];

  return queues.map((queueName) => {
    log(`Initializing worker for queue: ${queueName}`);

    const worker = workerFactory(
      queueName,
      createJobProcessor(queueName, {
        apiUrl: options.apiUrl,
        httpClient: options.httpClient,
        internalServiceToken: options.internalServiceToken,
        log
      })
    );

    worker.on("completed", (job: Job) => {
      log(`Job ${job.id} on ${queueName} has completed.`);
    });

    worker.on("failed", (job: Job | undefined, err: Error) => {
      log(`Job ${job?.id} on ${queueName} has failed with ${err.message}`);
    });

    return worker;
  });
}

if (process.env.BIRTHUB_DISABLE_ORCHESTRATOR_AUTOSTART !== "1") {
  startOrchestratorWorkers();
}
