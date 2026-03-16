import axios from "axios";
import { type Job, Worker } from "bullmq";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_API_URL = process.env.ORCHESTRATOR_API_URL || "http://localhost:8000";
const DEFAULT_INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;
const DEFAULT_REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const QueueName = {
  BOARD_REPORT: "BOARD_REPORT",
  CHURN_RISK_HIGH: "CHURN_RISK_HIGH",
  DEAL_CLOSED_WON: "DEAL_CLOSED_WON",
  HEALTH_SCORE_UPDATE: "HEALTH_SCORE_UPDATE"
} as const;

type QueueNameValue = (typeof QueueName)[keyof typeof QueueName];

export const QUEUE_TO_EVENT: Record<QueueNameValue, string> = {
  [QueueName.BOARD_REPORT]: "BOARD_REPORT",
  [QueueName.CHURN_RISK_HIGH]: "CHURN_RISK_HIGH",
  [QueueName.DEAL_CLOSED_WON]: "DEAL_CLOSED_WON",
  [QueueName.HEALTH_SCORE_UPDATE]: "HEALTH_ALERT"
};

type MinimalJobData = Record<string, unknown>;
type MinimalJob = Pick<Job<MinimalJobData, unknown, string>, "data" | "id" | "opts">;
type ProcessorResponse = { data: unknown };
type HttpClient = {
  post: (url: string, payload: unknown, config?: { headers?: Record<string, string> }) => Promise<ProcessorResponse>;
};
type WorkerLike = {
  on: Worker<MinimalJobData, unknown, string>["on"];
};
type WorkerFactory = (queueName: QueueNameValue, processor: (job: MinimalJob) => Promise<unknown>) => WorkerLike;

function resolveBullMqConnection(redisUrl: string) {
  const parsed = new URL(redisUrl);
  const db = parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : undefined;

  return {
    host: parsed.hostname,
    ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
    port: parsed.port ? Number(parsed.port) : 6379,
    ...(parsed.username ? { username: decodeURIComponent(parsed.username) } : {}),
    ...(Number.isInteger(db) ? { db } : {}),
  };
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function createBullMqWorker(queueName: QueueNameValue, processor: (job: MinimalJob) => Promise<unknown>): WorkerLike {
  const connection = resolveBullMqConnection(DEFAULT_REDIS_URL);
  return new Worker(queueName, async (job) => processor(job), { connection });
}

export function resolveEntityId(job: MinimalJob, eventType: string): string {
  if (eventType === "DEAL_CLOSED_WON") {
    return readString(job.data.dealId ?? job.data.deal_id ?? job.data.entity_id, "unknown");
  }
  return readString(job.data.customerId ?? job.data.customer_id ?? job.data.entity_id, "unknown");
}

export function buildOrchestratorEventPayload(queueName: QueueNameValue, job: MinimalJob) {
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
  queueName: QueueNameValue,
  options: {
    apiUrl?: string;
    httpClient?: HttpClient;
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
    const config = internalServiceToken
      ? { headers: { "x-service-token": internalServiceToken } }
      : undefined;

    log(`Processing job ${job.id} on ${queueName}`);
    const response = await httpClient.post(`${apiUrl}/events/run`, payload, config);
    log(`Job ${job.id} completed. Result:`, response.data);
    return response.data;
  };
}

export function startOrchestratorWorkers(options: {
  apiUrl?: string;
  httpClient?: HttpClient;
  internalServiceToken?: string;
  log?: (...args: unknown[]) => void;
  workerFactory?: WorkerFactory;
} = {}) {
  const log = options.log ?? console.log;
  const workerFactory = options.workerFactory ?? createBullMqWorker;

  log("Starting Orchestrator Worker...");
  if ((options.internalServiceToken ?? DEFAULT_INTERNAL_SERVICE_TOKEN) ) {
    log("Internal service token is enabled for Orchestrator worker requests.");
  }

  const queues: QueueNameValue[] = [
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
        ...(options.apiUrl ? { apiUrl: options.apiUrl } : {}),
        ...(options.httpClient ? { httpClient: options.httpClient } : {}),
        ...(options.internalServiceToken ? { internalServiceToken: options.internalServiceToken } : {}),
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
