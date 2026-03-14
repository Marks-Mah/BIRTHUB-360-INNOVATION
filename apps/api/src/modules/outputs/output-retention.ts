import { createLogger } from "@birthub/logger";

import { outputService } from "./output.service.js";

const logger = createLogger("output-retention");
let retentionTimer: NodeJS.Timeout | null = null;

export function startOutputRetentionScheduler(intervalMs = 60 * 60 * 1000): void {
  if (retentionTimer) {
    return;
  }

  retentionTimer = setInterval(() => {
    const deleted = outputService.prune();
    logger.info({ deleted }, "Output retention prune executed");
  }, intervalMs);

  retentionTimer.unref();
}
