import { prisma } from "@birthub/database";
import { createLogger } from "@birthub/logger";

import { flushBufferedAuditEvents } from "./auditFlush.js";
import { exportDailyBillingInvoices } from "./billingExport.js";
import { computeAndPersistHealthScores } from "./healthScore.js";
import { inviteCleanupJob } from "./inviteCleanup.js";
import { quotaResetJob } from "./quotaReset.js";
import { sunsetPolicyJob } from "./sunsetPolicy.js";

const logger = createLogger("worker-cycle2-jobs");

export interface Cycle2JobsRuntime {
  stop: () => Promise<void>;
}

export function startCycle2Jobs(): Cycle2JobsRuntime {
  const pruneWebhookDeliveryLogs = async () =>
    prisma.webhookDelivery.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

  void computeAndPersistHealthScores()
    .then((result) => {
      logger.info({ organizations: result.length }, "Initial health score job executed");
    })
    .catch((error) => {
      logger.error({ error }, "Initial health score job failed");
    });

  const timers = [
    setInterval(() => {
      void inviteCleanupJob().then((result) => {
        logger.info({ deleted: result.count }, "Invite cleanup job finished");
      });
    }, 60 * 60 * 1000),
    setInterval(() => {
      void flushBufferedAuditEvents().then((flushed) => {
        if (flushed > 0) {
          logger.info({ flushed }, "Audit flush job persisted buffered events");
        }
      });
    }, 5_000),
    setInterval(() => {
      const now = new Date();

      if (now.getUTCHours() === 0) {
        void quotaResetJob(now).then((result) => {
          logger.info(result, "Quota reset job ensured the new period exists");
        });
      }
    }, 60 * 60 * 1000),
    setInterval(() => {
      const now = new Date();

      if (now.getUTCHours() === 2) {
        void exportDailyBillingInvoices(now)
          .then((result) => {
            logger.info(
              {
                day: result.window.day,
                exports: result.exports.length
              },
              "Nightly billing invoice export finished"
            );
          })
          .catch((error) => {
            logger.error({ error }, "Nightly billing invoice export failed");
          });
      }

      if (now.getUTCHours() === 3) {
        void computeAndPersistHealthScores()
          .then((result) => {
            logger.info({ organizations: result.length }, "Health score job finished");
          })
          .catch((error) => {
            logger.error({ error }, "Health score job failed");
          });
        void pruneWebhookDeliveryLogs()
          .then((result) => {
            if (result.count > 0) {
              logger.info({ deleted: result.count }, "Old webhook delivery logs pruned");
            }
          })
          .catch((error) => {
            logger.error({ error }, "Webhook delivery pruning failed");
          });
        void sunsetPolicyJob()
          .then((result) => {
            if (result.notified > 0) {
              logger.info({ notified: result.notified }, "Sunset policy job executed");
            }
          })
          .catch((error) => {
            logger.error({ error }, "Sunset policy job failed");
          });
      }
    }, 60 * 60 * 1000)
  ];

  for (const timer of timers) {
    timer.unref?.();
  }

  return {
    stop: async () => {
      for (const timer of timers) {
        clearInterval(timer);
      }
    }
  };
}
