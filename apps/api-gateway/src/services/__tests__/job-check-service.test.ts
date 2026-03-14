import assert from "node:assert/strict";
import test from "node:test";
import type { Queue } from "bullmq";
type QueueName = "LEAD_ENRICHMENT" | "DEAL_CLOSED_WON";
import { InvalidQueueNameError, JobCheckService } from "../job-check-service.js";

type FakeJob = {
  getState: () => Promise<string>;
  remove: () => Promise<void>;
  retry?: () => Promise<unknown>;
};

type FakeQueue = Pick<Queue, "getJobCountByTypes" | "getFailed" | "close" | "getJob">;

type AlertServiceSpy = {
  calls: Array<{ title: string; message: string; severity: "info" | "warning" | "critical" }>;
  sendAlert: (title: string, message: string, severity: "info" | "warning" | "critical") => Promise<void>;
};

const createAlertSpy = (): AlertServiceSpy => {
  const calls: AlertServiceSpy["calls"] = [];
  return {
    calls,
    sendAlert: async (title, message, severity) => {
      calls.push({ title, message, severity });
    },
  };
};

const createQueueFactory = (queue: FakeQueue) => {
  return (_queueName: QueueName): FakeQueue => queue;
};

const createService = (queue: FakeQueue) => {
  const spy = createAlertSpy();
  const queueFactory = createQueueFactory(queue);

  return {
    alertService: spy,
    service: new JobCheckService(spy, queueFactory),
  };
};

test("JobCheckService.checkFailedJobs envia alerta quando encontra falha", async () => {
  const queue: FakeQueue = {
    getJobCountByTypes: async () => 2,
    getFailed: async () => [],
    getJob: async () => null,
    close: async () => undefined,
  };

  const { service, alertService } = createService(queue);
  const result = await service.checkFailedJobs();

  assert.equal(result.length, 2);
  assert.equal(alertService.calls.length, 2);
  assert.equal(alertService.calls[0]?.severity, "critical");
});

test("JobCheckService.retryFailedJobs reprocessa jobs falhos", async () => {
  let retries = 0;
  const failedJobs: FakeJob[] = [
    { retry: async () => { retries += 1; }, remove: async () => undefined, getState: async () => "failed" },
    { retry: async () => { retries += 1; }, remove: async () => undefined, getState: async () => "failed" },
  ];

  const queue: FakeQueue = {
    getJobCountByTypes: async () => 0,
    getFailed: async () => failedJobs as never,
    getJob: async () => null,
    close: async () => undefined,
  };

  const { service } = createService(queue);
  const result = await service.retryFailedJobs("LEAD_ENRICHMENT");

  assert.equal(result.retried, 2);
  assert.equal(retries, 2);
});

test("JobCheckService.retryFailedJobs valida fila inválida", async () => {
  const queue: FakeQueue = {
    getJobCountByTypes: async () => 0,
    getFailed: async () => [],
    getJob: async () => null,
    close: async () => undefined,
  };

  const { service } = createService(queue);

  await assert.rejects(
    service.retryFailedJobs("invalid-queue"),
    (error: unknown) => error instanceof InvalidQueueNameError,
  );
});

test("JobCheckService.cancelJobExecution remove jobs canceláveis", async () => {
  let removed = false;
  const queue: FakeQueue = {
    getJobCountByTypes: async () => 0,
    getFailed: async () => [],
    getJob: async () => ({
      getState: async () => "waiting",
      remove: async () => { removed = true; },
    } as FakeJob),
    close: async () => undefined,
  };

  const { service } = createService(queue);
  const result = await service.cancelJobExecution({ queueName: "LEAD_ENRICHMENT", jobId: "job-1", traceId: "trace-1" });

  assert.equal(result.cancelled, true);
  assert.equal(result.status, "cancelled");
  assert.equal(removed, true);
});

test("JobCheckService.cancelJobExecution retorna active_not_cancellable para job ativo", async () => {
  const queue: FakeQueue = {
    getJobCountByTypes: async () => 0,
    getFailed: async () => [],
    getJob: async () => ({
      getState: async () => "active",
      remove: async () => undefined,
    } as FakeJob),
    close: async () => undefined,
  };

  const { service } = createService(queue);
  const result = await service.cancelJobExecution({ queueName: "LEAD_ENRICHMENT", jobId: "active-job" });

  assert.equal(result.cancelled, false);
  assert.equal(result.status, "active_not_cancellable");
  assert.equal(result.idempotent, true);
});

test("JobCheckService.cancelJobExecution retorna already_finalized para job finalizado", async () => {
  const queue: FakeQueue = {
    getJobCountByTypes: async () => 0,
    getFailed: async () => [],
    getJob: async () => ({
      getState: async () => "completed",
      remove: async () => undefined,
    } as FakeJob),
    close: async () => undefined,
  };

  const { service } = createService(queue);
  const result = await service.cancelJobExecution({ queueName: "LEAD_ENRICHMENT", jobId: "completed-job" });

  assert.equal(result.cancelled, false);
  assert.equal(result.status, "already_finalized");
  assert.equal(result.idempotent, true);
});

test("JobCheckService.cancelJobExecution é idempotente para job inexistente", async () => {
  const queue: FakeQueue = {
    getJobCountByTypes: async () => 0,
    getFailed: async () => [],
    getJob: async () => null,
    close: async () => undefined,
  };

  const { service } = createService(queue);
  const result = await service.cancelJobExecution({ queueName: "LEAD_ENRICHMENT", jobId: "missing-job" });

  assert.equal(result.cancelled, false);
  assert.equal(result.status, "not_found");
  assert.equal(result.idempotent, true);
});

test("JobCheckService.cancelJobExecution valida fila inválida", async () => {
  const queue: FakeQueue = {
    getJobCountByTypes: async () => 0,
    getFailed: async () => [],
    getJob: async () => null,
    close: async () => undefined,
  };

  const { service } = createService(queue);

  await assert.rejects(
    service.cancelJobExecution({ queueName: "invalid-queue", jobId: "job-1" }),
    (error: unknown) => error instanceof InvalidQueueNameError,
  );
});
