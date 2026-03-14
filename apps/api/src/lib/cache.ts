export function buildTenantCacheKey(tenantId: string, resource: string, identifier?: string): string {
  return ["birthub", resource, tenantId, identifier].filter(Boolean).join(":");
}
