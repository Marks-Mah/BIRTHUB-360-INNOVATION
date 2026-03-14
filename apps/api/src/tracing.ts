import { createRequire } from "node:module";

type OtelApi = {
  context: {
    active: () => unknown;
  };
  trace: {
    getSpan: (activeContext: unknown) => { setAttribute: (key: string, value: unknown) => void } | undefined;
  };
};

const require = createRequire(import.meta.url);

let otelApi: OtelApi | null = null;

try {
  otelApi = require("@opentelemetry/api") as OtelApi;
} catch {
  otelApi = null;
}

const forceSampledTenants = new Set<string>();

export function annotateTenantSpan(input: {
  tenantId?: string | null;
  tenantSlug?: string | null;
}): void {
  if (!otelApi) {
    return;
  }

  const span = otelApi.trace.getSpan(otelApi.context.active());

  if (!span) {
    return;
  }

  if (input.tenantId) {
    span.setAttribute("tenant.id", input.tenantId);
    span.setAttribute("tenant.force_sampled", forceSampledTenants.has(input.tenantId));
  }

  if (input.tenantSlug) {
    span.setAttribute("tenant.slug", input.tenantSlug);
  }
}

export function flagTenantForFullSampling(tenantId: string): void {
  forceSampledTenants.add(tenantId);
}

export function shouldForceTenantSampling(tenantId?: string | null): boolean {
  return Boolean(tenantId && forceSampledTenants.has(tenantId));
}
