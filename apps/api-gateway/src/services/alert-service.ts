import { logger } from "../lib/logger.js";

export class AlertService {
  async sendAlert(subject: string, message: string, severity: "info" | "warning" | "critical" = "info") {
    // In a real implementation, this would send an email (Resend) or Slack webhook
    logger.warn(`[ALERT][${severity.toUpperCase()}] ${subject}: ${message}`);

    if (process.env.SLACK_WEBHOOK_URL) {
      // await fetch(process.env.SLACK_WEBHOOK_URL, { ... })
    }
  }
}