export class BaseWorker {
    maxAttempts;
    metrics = { success: 0, failed: 0 };
    constructor(maxAttempts = 3) {
        this.maxAttempts = maxAttempts;
    }
    async run(payload) {
        let attempts = 0;
        while (attempts < this.maxAttempts) {
            attempts += 1;
            try {
                await this.process(payload);
                this.metrics.success += 1;
                return { status: "ok", attempts };
            }
            catch {
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
