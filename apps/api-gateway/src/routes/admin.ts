import { Router } from "express";
import { asyncHandler, HttpError } from "../errors/http-error.js";
import { InvalidQueueNameError, JobCheckService } from "../services/job-check-service.js";
import { AlertService } from "../services/alert-service.js";
import { requireAuthorization } from "../middleware/authorization.js";

const adminRouter: Router = Router();
const jobCheckService = new JobCheckService(new AlertService());

adminRouter.post("/jobs/check-alerts", requireAuthorization({ roles: ["admin"] }), asyncHandler(async (req, res) => {
  const result = await jobCheckService.checkFailedJobs();
  res.json(result);
}));

adminRouter.post("/jobs/:queue/retry-failed", requireAuthorization({ roles: ["admin"] }), asyncHandler(async (req, res) => {
  try {
    const result = await jobCheckService.retryFailedJobs(req.params.queue);
    res.json(result);
  } catch (error) {
    if (error instanceof InvalidQueueNameError) {
      throw new HttpError(400, "INVALID_QUEUE", error.message, { queue: req.params.queue });
    }
    throw error;
  }
}));

adminRouter.post("/jobs/:queue/:jobId/cancel", requireAuthorization({ roles: ["admin"] }), asyncHandler(async (req, res) => {
  const jobId = req.params.jobId?.trim();
  if (!jobId) {
    throw new HttpError(400, "INVALID_JOB_ID", "Job id must be informed", { jobId: req.params.jobId });
  }

  try {
    const result = await jobCheckService.cancelJobExecution({
      queueName: req.params.queue,
      jobId,
      traceId: req.header("x-trace-id") ?? undefined,
    });
    res.json(result);
  } catch (error) {
    if (error instanceof InvalidQueueNameError) {
      throw new HttpError(400, "INVALID_QUEUE", error.message, { queue: req.params.queue });
    }
    throw error;
  }
}));

export { adminRouter };
