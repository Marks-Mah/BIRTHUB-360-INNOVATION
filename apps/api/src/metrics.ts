import { performance } from "node:perf_hooks";

import type { NextFunction, Request, Response } from "express";

type MetricLabels = Record<string, string>;

const requestCounters = new Map<string, number>();
const jobCounters = new Map<string, number>();
const storageGauges = new Map<string, number>();

function serializeMetricKey(name: string, labels: MetricLabels): string {
  const stableLabels = Object.entries(labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}="${value.replace(/"/g, '\\"')}"`)
    .join(",");

  return stableLabels ? `${name}{${stableLabels}}` : name;
}

function incrementMetric(store: Map<string, number>, name: string, labels: MetricLabels, amount = 1): void {
  const key = serializeMetricKey(name, labels);
  store.set(key, (store.get(key) ?? 0) + amount);
}

function setMetric(store: Map<string, number>, name: string, labels: MetricLabels, value: number): void {
  const key = serializeMetricKey(name, labels);
  store.set(key, value);
}

function renderMetricSection(type: "counter" | "gauge", name: string, help: string, store: Map<string, number>): string {
  const lines = [`# HELP ${name} ${help}`, `# TYPE ${name} ${type}`];

  for (const [key, value] of store.entries()) {
    lines.push(`${key} ${value}`);
  }

  return lines.join("\n");
}

export function recordTenantJobMetric(tenantId: string, jobName: string): void {
  incrementMetric(jobCounters, "birthub_tenant_jobs_total", {
    job_name: jobName,
    tenant_id: tenantId
  });
}

export function setTenantStorageMetric(tenantId: string, bytes: number): void {
  setMetric(storageGauges, "birthub_tenant_storage_bytes", { tenant_id: tenantId }, bytes);
}

export function metricsMiddleware(request: Request, response: Response, next: NextFunction): void {
  const startedAt = performance.now();

  response.on("finish", () => {
    incrementMetric(requestCounters, "birthub_tenant_requests_total", {
      method: request.method,
      route: request.route?.path ?? request.path,
      status: String(response.statusCode),
      tenant_id: request.context.tenantId ?? "anonymous"
    });

    incrementMetric(requestCounters, "birthub_tenant_request_duration_ms_total", {
      method: request.method,
      route: request.route?.path ?? request.path,
      tenant_id: request.context.tenantId ?? "anonymous"
    }, Math.round(performance.now() - startedAt));
  });

  next();
}

export function metricsHandler(_request: Request, response: Response): void {
  response
    .type("text/plain; version=0.0.4")
    .send(
      [
        renderMetricSection(
          "counter",
          "birthub_tenant_requests_total",
          "Total HTTP requests grouped by tenant.",
          requestCounters
        ),
        renderMetricSection(
          "counter",
          "birthub_tenant_jobs_total",
          "Total worker jobs grouped by tenant.",
          jobCounters
        ),
        renderMetricSection(
          "gauge",
          "birthub_tenant_storage_bytes",
          "Current storage footprint estimate grouped by tenant.",
          storageGauges
        )
      ].join("\n")
    );
}
