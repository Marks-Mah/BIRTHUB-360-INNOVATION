import { BaseWorker } from "./base-worker";
export class ReportWorker extends BaseWorker {
    async process(payload) {
        if (payload.failed)
            throw new Error("REPORT_FAILED");
    }
}
