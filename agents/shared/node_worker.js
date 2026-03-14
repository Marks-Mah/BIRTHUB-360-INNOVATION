const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const axios = require("axios");

// Usage: node node_worker.js <queue_name> <agent_url> <redis_url>
const args = process.argv.slice(2);
const QUEUE_NAME = args[0] || "default";
const AGENT_URL = args[1] || "http://localhost:8000/run";
const REDIS_URL = args[2] || "redis://localhost:6379";
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

console.log(`Starting Node Worker for queue: ${QUEUE_NAME}`);
console.log(`Target Agent URL: ${AGENT_URL}`);
if (INTERNAL_SERVICE_TOKEN) {
  console.log("Internal service token is enabled for worker requests.");
}

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    console.log(`[${QUEUE_NAME}] Processing job ${job.id}:`, job.data);
    try {
      const headers = INTERNAL_SERVICE_TOKEN
        ? { "x-service-token": INTERNAL_SERVICE_TOKEN }
        : undefined;
      const response = await axios.post(AGENT_URL, job.data, { headers });
      console.log(`[${QUEUE_NAME}] Job ${job.id} completed. Agent response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[${QUEUE_NAME}] Job ${job.id} failed:`, error.message);
      if (error.response) {
        console.error("Agent error details:", error.response.data);
      }
      throw error;
    }
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`[${QUEUE_NAME}] Job ${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  console.log(`[${QUEUE_NAME}] Job ${job.id} has failed with ${err.message}`);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing worker");
  await worker.close();
  process.exit(0);
});

console.log("Worker is running...");
