import { createWorker } from "@birthub/queue";
import { QueueName } from "@birthub/shared-types";
import axios from "axios";
import dotenv from "dotenv";
import { Job } from "bullmq";

dotenv.config();

const API_URL = process.env.AE_AGENT_API_URL || "http://localhost:8003";
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

console.log("Starting AE Worker...");
if (INTERNAL_SERVICE_TOKEN) {
  console.log("Internal service token is enabled for AE worker requests.");
}

const queues = [QueueName.AE_QUEUE, QueueName.DEAL_CLOSED_WON];

queues.forEach((queueName) => {
  console.log(`Initializing worker for queue: ${queueName}`);

  const worker = createWorker(queueName, async (job: Job) => {
    console.log(`Processing job ${job.id} on ${queueName}`);

    try {
      const payload = {
        deal_id: job.data.dealId || job.data.deal_id || "unknown",
        lead_id: job.data.leadId || job.data.lead_id || "unknown",
        context: {
          job_id: job.id,
          queue: queueName,
          ...job.data,
        },
      };

      const headers = INTERNAL_SERVICE_TOKEN
        ? { "x-service-token": INTERNAL_SERVICE_TOKEN }
        : undefined;

      const response = await axios.post(`${API_URL}/run`, payload, { headers });

      console.log(`Job ${job.id} completed. Result:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`Job ${job.id} failed:`, error.message);
      if (error.response) {
        console.error("Response data:", error.response.data);
      }
      throw error;
    }
  });

  worker.on("completed", (job: Job) => {
    console.log(`Job ${job.id} on ${queueName} has completed!`);
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    console.log(`Job ${job?.id} on ${queueName} has failed with ${err.message}`);
  });
});
