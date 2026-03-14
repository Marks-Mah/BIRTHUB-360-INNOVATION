import assert from "node:assert/strict";
import test from "node:test";

import { signJobPayload, validateJobContext, verifyJobPayloadSignature } from "../src/job-context";

void test("job context validation requires immutable tracking fields", () => {
  assert.equal(
    validateJobContext({
      actorId: "user_1",
      jobId: "job_1",
      scopedAt: new Date("2026-03-13T00:00:00.000Z").toISOString(),
      tenantId: "tenant_1"
    }),
    true
  );
  assert.equal(
    validateJobContext({
      actorId: "",
      jobId: "job_1",
      scopedAt: "invalid-date",
      tenantId: "tenant_1"
    }),
    false
  );
});

void test("job payload signatures detect tampering", () => {
  const payload = JSON.stringify({
    context: {
      actorId: "user_1",
      jobId: "job_1",
      scopedAt: new Date("2026-03-13T00:00:00.000Z").toISOString(),
      tenantId: "tenant_1"
    },
    requestId: "req_1"
  });
  const signature = signJobPayload(payload, "tenant-secret");

  assert.equal(verifyJobPayloadSignature(payload, "tenant-secret", signature), true);
  assert.equal(
    verifyJobPayloadSignature(
      `${payload}-tampered`,
      "tenant-secret",
      signature
    ),
    false
  );
});
