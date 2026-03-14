import { BaseWorker } from "./base-worker";

export interface ReportJobPayload { reportId: string; type: "board" | "financial"; failed?: boolean }

export class ReportWorker extends BaseWorker<ReportJobPayload> {
  protected async process(payload: ReportJobPayload): Promise<void> {
    if (payload.failed) throw new Error("REPORT_FAILED");
  }
}
