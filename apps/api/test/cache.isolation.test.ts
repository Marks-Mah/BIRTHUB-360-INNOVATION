import assert from "node:assert/strict";
import test from "node:test";

import { buildTenantCacheKey } from "../src/lib/cache.js";

test("cache keys sempre incluem o tenantId", () => {
  const tenantAKey = buildTenantCacheKey("tenant-a", "members", "page-1");
  const tenantBKey = buildTenantCacheKey("tenant-b", "members", "page-1");

  assert.notEqual(tenantAKey, tenantBKey);
  assert.match(tenantAKey, /tenant-a/);
  assert.match(tenantBKey, /tenant-b/);
});
