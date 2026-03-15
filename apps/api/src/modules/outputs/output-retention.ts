import { createLogger } from "@birthub/logger";

import { outputService } from "./output.service.js";

const logger = createLogger("output-retention");
let retentionTimer: NodeJS.Timeout | null = null;

export function startOutputRetentionScheduler(intervalMs = 60 * 60 * 1000): void {
  if (retentionTimer) {
    return;
  }

  retentionTimer = setInterval(() => {
    void outputService
      .prune()
      .then((deleted) => {
        logger.info({ deleted }, "Output retention prune executed");
      })
      .catch((error) => {
        logger.error({ error }, "Output retention prune failed");
      });
  }, intervalMs);

  retentionTimer.unref();
}
