import { AsyncLocalStorage } from "node:async_hooks";

import { TenantRequiredError } from "./errors/tenant-required.error.js";

export type TenantSource = "active-header" | "authenticated" | "seed" | "system";

export interface TenantContext {
  tenantId: string;
  tenantSlug?: string | null;
  userId?: string | null;
  source: TenantSource;
}

const tenantContextStorage = new AsyncLocalStorage<Readonly<TenantContext>>();

function normalizeTenantId(tenantId: string | null | undefined, operation: string): string {
  const normalizedTenantId = tenantId?.trim();

  if (!normalizedTenantId) {
    throw new TenantRequiredError(operation);
  }

  return normalizedTenantId;
}

export function runWithTenantContext<T>(context: TenantContext, callback: () => T): T {
  const normalizedContext = Object.freeze({
    ...context,
    tenantId: normalizeTenantId(context.tenantId, "tenant context bootstrap")
  });

  return tenantContextStorage.run(normalizedContext, callback);
}

export function getTenantContext(): Readonly<TenantContext> | null {
  return tenantContextStorage.getStore() ?? null;
}

export function requireTenantId(operation = "this operation"): string {
  return normalizeTenantId(getTenantContext()?.tenantId, operation);
}
