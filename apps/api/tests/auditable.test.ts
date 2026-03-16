import assert from "node:assert/strict";
import test from "node:test";

import { Auditable } from "../src/audit/auditable.js";
import { ProblemDetailsError } from "../src/lib/problem-details.js";

void test("Auditable requireActor blocks sensitive mutations without an authenticated actor", async () => {
  const handler = Auditable({
    action: "packs.install",
    entityType: "pack",
    requireActor: true
  })(async () => ({ ok: true }));

  const request = {
    body: { packId: "pack_1" },
    context: {
      requestId: "req_1",
      tenantId: "tenant_1",
      userId: null
    },
    get: () => null,
    ip: "127.0.0.1",
    method: "POST",
    params: {}
  };

  await assert.rejects(
    handler(
      request as never,
      {} as never,
      (() => {
        return undefined;
      }) as never
    ),
    (error: unknown) => {
      assert.ok(error instanceof ProblemDetailsError);
      assert.equal(error.status, 401);
      assert.equal(error.title, "Unauthorized");
      return true;
    }
  );
});
