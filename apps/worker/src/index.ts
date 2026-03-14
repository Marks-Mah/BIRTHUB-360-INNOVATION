import { createServer } from "node:http";

import { getWorkerConfig } from "@birthub/config";
import { createLogger } from "@birthub/logger";

import {
  evaluateFailRateAlerts,
  LoggingFailRateNotifier,
  NoopFailRateMetricsSource
} from "./alerts/failRateAlert.js";
import { startCycle2Jobs } from "./jobs/scheduler.js";
import { cleanupSuspendedUsers } from "./jobs/userCleanup.js";
import { createBirthHubWorker } from "./worker.js";

const config = getWorkerConfig();
const logger = createLogger("worker-bootstrap");
const runtime = createBirthHubWorker();
const cleanupIntervalMs = 24 * 60 * 60 * 1000;
const failRateIntervalMs = 5 * 60 * 1000;
const failRateMetricsSource = new NoopFailRateMetricsSource();
const failRateNotifier = new LoggingFailRateNotifier();
const cycle2Jobs = startCycle2Jobs();
const healthServer = createServer((request, response) => {
  if (request.url !== "/health") {
    response.writeHead(404).end();
    return;
  }

  response.writeHead(200, {
    "content-type": "application/json"
  });
  response.end(
    JSON.stringify({
      checkedAt: new Date().toISOString(),
      queueName: config.QUEUE_NAME,
      status: "ok",
      workerConcurrency: config.WORKER_CONCURRENCY
    })
  );
});
const cleanupTimer = setInterval(() => {
  void cleanupSuspendedUsers()
    .then((result) => {
      logger.info(result, "Suspended users cleanup executed");
    })
    .catch((error) => {
      logger.error({ error }, "Suspended users cleanup failed");
    });
}, cleanupIntervalMs);
const failRateTimer = setInterval(() => {
  void evaluateFailRateAlerts({
    notifier: failRateNotifier,
    source: failRateMetricsSource,
    threshold: 0.2,
    windowMinutes: 5
  }).catch((error) => {
    logger.error({ error }, "Fail-rate alert evaluation failed");
  });
}, failRateIntervalMs);

void cleanupSuspendedUsers()
  .then((result) => {
    logger.info(result, "Initial suspended users cleanup executed");
  })
  .catch((error) => {
    logger.error({ error }, "Initial suspended users cleanup failed");
  });

logger.info(
  {
    concurrency: config.WORKER_CONCURRENCY,
    healthPort: config.WORKER_HEALTH_PORT,
    queueName: config.QUEUE_NAME,
    queues: runtime.workers.map((worker) => worker.name)
  },
  "BirthHub360 worker online"
);

healthServer.listen(config.WORKER_HEALTH_PORT, () => {
  logger.info({ healthPort: config.WORKER_HEALTH_PORT }, "Worker health server online");
});

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, "Shutting down worker");
  clearInterval(cleanupTimer);
  clearInterval(failRateTimer);
  await new Promise<void>((resolve, reject) => {
    healthServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
  await cycle2Jobs.stop();
  await runtime.close();
  logger.info({ signal }, "Worker shutdown completed");
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});
