import { createWorker } from "@birthub/queue";
import { QueueName } from "@birthub/shared-types";
import axios from "axios";
import dotenv from "dotenv";
import { Job } from "bullmq";

dotenv.config();

const API_URL = process.env.ORCHESTRATOR_API_URL || "http://localhost:8000";
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

const QUEUE_TO_EVENT: Record<string, string> = {
  [QueueName.DEAL_CLOSED_WON]: "DEAL_CLOSED_WON",
  [QueueName.HEALTH_SCORE_UPDATE]: "HEALTH_ALERT",
  [QueueName.BOARD_REPORT]: "BOARD_REPORT",
  [QueueName.CHURN_RISK_HIGH]: "CHURN_RISK_HIGH",
};

function resolveEntityId(job: Job, eventType: string): string {
  if (eventType === "DEAL_CLOSED_WON") {
    return String(job.data.dealId || job.data.deal_id || job.data.entity_id || "unknown");
  }
  return String(job.data.customerId || job.data.customer_id || job.data.entity_id || "unknown");
}

console.log("Starting Orchestrator Worker...");
if (INTERNAL_SERVICE_TOKEN) {
  console.log("Internal service token is enabled for Orchestrator worker requests.");
}

const queues = [
  QueueName.DEAL_CLOSED_WON,
  QueueName.HEALTH_SCORE_UPDATE,
  QueueName.CHURN_RISK_HIGH,
  QueueName.BOARD_REPORT,
];

queues.forEach((queueName) => {
  console.log(`Initializing worker for queue: ${queueName}`);

  const worker = createWorker(queueName, async (job: Job) => {
    const eventType = QUEUE_TO_EVENT[queueName];
    if (!eventType) {
      throw new Error(`No event mapping configured for queue ${queueName}`);
    }

    console.log(`Processing job ${job.id} on ${queueName}`);

    const payload = {
      event_id: `${queueName}:${job.id}`,
      event_type: eventType,
      entity_id: resolveEntityId(job, eventType),
      context: {
        queue: queueName,
        job_id: job.id,
        priority: job.opts.priority ?? 0,
        tenant_id: job.data.tenantId || job.data.tenant_id || null,
        ...job.data,
      },
    };

    const headers = INTERNAL_SERVICE_TOKEN ? { "x-service-token": INTERNAL_SERVICE_TOKEN } : undefined;

    const response = await axios.post(`${API_URL}/run/event`, payload, { headers });
    console.log(`Job ${job.id} completed. Result:`, response.data);
    return response.data;
  });

  worker.on("completed", (job: Job) => {
    console.log(`Job ${job.id} on ${queueName} has completed.`);
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    console.log(`Job ${job?.id} on ${queueName} has failed with ${err.message}`);
  });
});
