import { getApiConfig } from "@birthub/config";
import { createLogger } from "@birthub/logger";

import { createApp } from "./app.js";
import { initializeOpenTelemetry, shutdownOpenTelemetry } from "./observability/otel.js";
import { initializeApiSentry } from "./observability/sentry.js";

const config = getApiConfig();
const logger = createLogger("api-bootstrap");

initializeApiSentry(config);
await initializeOpenTelemetry(config);

const app = createApp();
const server = app.listen(config.API_PORT, () => {
  logger.info({ port: config.API_PORT }, "BirthHub360 API listening");
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down API");
  server.close();
  await shutdownOpenTelemetry();
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
