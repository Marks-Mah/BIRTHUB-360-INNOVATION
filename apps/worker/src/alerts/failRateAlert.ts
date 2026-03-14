import { createLogger } from "@birthub/logger";

const logger = createLogger("worker-fail-rate-alert");

export interface FailRateWindow {
  tenantId: string;
  agentId: string;
  successCount: number;
  failedCount: number;
}

export interface FailRateAlert {
  tenantId: string;
  agentId: string;
  failRate: number;
  windowMinutes: number;
}

export interface FailRateMetricsSource {
  listWindows(windowMinutes: number): Promise<FailRateWindow[]>;
}

export interface FailRateNotifier {
  sendEmail(alert: FailRateAlert): Promise<void>;
  sendInApp(alert: FailRateAlert): Promise<void>;
}

export class NoopFailRateMetricsSource implements FailRateMetricsSource {
  async listWindows(): Promise<FailRateWindow[]> {
    return [];
  }
}

export class LoggingFailRateNotifier implements FailRateNotifier {
  async sendEmail(alert: FailRateAlert): Promise<void> {
    logger.warn({ alert }, "Fail-rate email alert dispatched");
  }

  async sendInApp(alert: FailRateAlert): Promise<void> {
    logger.warn({ alert }, "Fail-rate in-app alert dispatched");
  }
}

export async function evaluateFailRateAlerts(input: {
  source: FailRateMetricsSource;
  notifier: FailRateNotifier;
  threshold?: number;
  windowMinutes?: number;
}): Promise<FailRateAlert[]> {
  const threshold = input.threshold ?? 0.2;
  const windowMinutes = input.windowMinutes ?? 5;

  const windows = await input.source.listWindows(windowMinutes);
  const alerts: FailRateAlert[] = [];

  for (const row of windows) {
    const total = row.successCount + row.failedCount;
    if (total <= 0) {
      continue;
    }

    const failRate = row.failedCount / total;
    if (failRate <= threshold) {
      continue;
    }

    const alert: FailRateAlert = {
      agentId: row.agentId,
      failRate,
      tenantId: row.tenantId,
      windowMinutes
    };

    await input.notifier.sendInApp(alert);
    await input.notifier.sendEmail(alert);
    alerts.push(alert);
  }

  return alerts;
}
