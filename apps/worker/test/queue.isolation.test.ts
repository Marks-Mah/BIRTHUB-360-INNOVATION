import assert from "node:assert/strict";
import test from "node:test";

import { getTenantContext } from "@birthub/database";

import { executeTenantJob } from "../src/tenant-execution.js";

void test("jobs concorrentes mantem o tenantContext isolado", async () => {
  const [tenantA, tenantB] = await Promise.all([
    executeTenantJob(
      {
        requestId: "req-a",
        tenantId: "tenant-a",
        userId: "user-a"
      },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 15));
        return getTenantContext()?.tenantId;
      }
    ),
    executeTenantJob(
      {
        requestId: "req-b",
        tenantId: "tenant-b",
        userId: "user-b"
      },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return getTenantContext()?.tenantId;
      }
    )
  ]);

  assert.equal(tenantA, "tenant-a");
  assert.equal(tenantB, "tenant-b");
});
