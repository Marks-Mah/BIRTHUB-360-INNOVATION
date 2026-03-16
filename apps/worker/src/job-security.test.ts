import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { validateLegacyTaskJob } from "./worker.js";

function sign(payload: unknown, secret: string): string {
  return createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
}

void test("worker rejects manipulated jobs with tenant mismatch", () => {
  assert.throws(
    () =>
      validateLegacyTaskJob({
        fallbackSecret: "fallback",
        jobId: "job_1",
        payload: {
          agentId: "ceo-pack",
          approvalRequired: false,
          context: {
            actorId: "user_1",
            jobId: "job_1",
            organizationId: "org_1",
            scopedAt: new Date("2026-03-13T00:00:00.000Z").toISOString(),
            tenantId: "tenant_a"
          },
          estimatedCostBRL: 0.5,
          executionMode: "LIVE",
          payload: {},
          requestId: "req_1",
          signature: "invalid",
          tenantId: "tenant_b",
          type: "sync-session",
          userId: "user_1",
          version: "1"
        },
        tenantSecret: "tenant-secret"
      }),
    /JOB_CONTEXT_TENANT_MISMATCH/
  );
});

void test("worker validates HMAC signature for legacy jobs", () => {
  const unsignedPayload = {
    agentId: "ceo-pack",
    approvalRequired: false,
    context: {
      actorId: "user_1",
      jobId: "job_1",
      organizationId: "org_1",
      scopedAt: new Date("2026-03-13T00:00:00.000Z").toISOString(),
      tenantId: "tenant_a"
    },
    estimatedCostBRL: 0.5,
    executionMode: "LIVE" as const,
    payload: {
      channel: "email"
    },
    requestId: "req_1",
    tenantId: "tenant_a",
    type: "send-welcome-email" as const,
    userId: "user_1",
    version: "1" as const
  };
  const signature = sign(unsignedPayload, "tenant-secret");

  const validatedTenant = validateLegacyTaskJob({
    fallbackSecret: "fallback",
    jobId: "job_1",
    payload: {
      ...unsignedPayload,
      signature
    },
    tenantSecret: "tenant-secret"
  });

  assert.equal(validatedTenant, "tenant_a");
});
