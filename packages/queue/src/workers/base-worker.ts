export interface WorkerMetrics {
  success: number;
  failed: number;
}

export interface WorkerResult {
  status: "ok" | "retry" | "dlq";
  attempts: number;
}

export abstract class BaseWorker<TPayload> {
  protected metrics: WorkerMetrics = { success: 0, failed: 0 };

  constructor(private readonly maxAttempts: number = 3) {}

  protected abstract process(payload: TPayload): Promise<void>;

  async run(payload: TPayload): Promise<WorkerResult> {
    let attempts = 0;
    while (attempts < this.maxAttempts) {
      attempts += 1;
      try {
        await this.process(payload);
        this.metrics.success += 1;
        return { status: "ok", attempts };
      } catch {
        if (attempts >= this.maxAttempts) {
          this.metrics.failed += 1;
          return { status: "dlq", attempts };
        }
      }
    }

    this.metrics.failed += 1;
    return { status: "retry", attempts };
  }

  getMetrics() {
    return { ...this.metrics };
  }
}
