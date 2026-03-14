import type { Organization } from "@birthub/database";

import { deleteCacheKeys, readCacheValue, writeCacheValue } from "./cache-store.js";

const TENANT_CACHE_TTL_SECONDS = 5 * 60;

export interface CachedTenant {
  id: string;
  slug: string | null;
  tenantId: string;
}

function normalizeReference(reference: string): string {
  return reference.trim().toLowerCase();
}

function buildTenantCacheKey(reference: string): string {
  return `tenant:${normalizeReference(reference)}`;
}

function buildCacheKeysFromTenant(tenant: CachedTenant): string[] {
  return [tenant.id, tenant.slug, tenant.tenantId]
    .filter((value): value is string => Boolean(value))
    .map((value) => buildTenantCacheKey(value));
}

export async function cacheTenant(organization: Pick<Organization, "id" | "slug" | "tenantId">): Promise<void> {
  const tenant: CachedTenant = {
    id: organization.id,
    slug: organization.slug ?? null,
    tenantId: organization.tenantId
  };
  const payload = JSON.stringify(tenant);

  await Promise.all(
    buildCacheKeysFromTenant(tenant).map((key) =>
      writeCacheValue(key, payload, TENANT_CACHE_TTL_SECONDS)
    )
  );
}

export async function getCachedTenant(reference: string): Promise<CachedTenant | null> {
  const raw = await readCacheValue(buildTenantCacheKey(reference));

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CachedTenant;

    if (!parsed.id || !parsed.tenantId) {
      return null;
    }

    return {
      id: parsed.id,
      slug: parsed.slug ?? null,
      tenantId: parsed.tenantId
    };
  } catch {
    return null;
  }
}

export async function invalidateTenantCache(references: Array<string | null | undefined>): Promise<void> {
  const keys = Array.from(
    new Set(
      references
        .filter((reference): reference is string => Boolean(reference?.trim()))
        .map((reference) => buildTenantCacheKey(reference))
    )
  );

  await deleteCacheKeys(keys);
}
