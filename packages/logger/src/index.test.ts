import assert from "node:assert/strict";
import test from "node:test";

import { createLogger, runWithLogContext } from "./index.js";

async function captureStdout(callback: () => void): Promise<Record<string, unknown>> {
  const chunks: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);

  process.stdout.write = ((chunk: unknown, encoding?: BufferEncoding | (() => void), callbackFn?: () => void) => {
    const rendered =
      typeof chunk === "string"
        ? chunk
        : Buffer.isBuffer(chunk)
          ? chunk.toString(typeof encoding === "string" ? encoding : "utf8")
          : String(chunk);

    chunks.push(rendered);

    if (typeof encoding === "function") {
      encoding();
    } else if (typeof callbackFn === "function") {
      callbackFn();
    }

    return true;
  }) as typeof process.stdout.write;

  try {
    callback();
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    process.stdout.write = originalWrite;
  }

  const rawLine = chunks
    .join("")
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("{"));

  assert.ok(rawLine, "Expected logger to emit one JSON line.");
  return JSON.parse(rawLine);
}

void test("logger emits the structured observability contract in camelCase", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousLogLevel = process.env.LOG_LEVEL;

  process.env.NODE_ENV = "production";
  process.env.LOG_LEVEL = "info";

  try {
    const payload = await captureStdout(() =>
      runWithLogContext(
        {
          jobId: "job_123",
          requestId: "req_123",
          tenantId: "tenant_123",
          traceId: "trace_123",
          userId: "user_123"
        },
        () => {
          const logger = createLogger("worker");
          logger.info(
            {
              context: {
                phase: "webhook"
              },
              event: "billing.webhook.received"
            },
            "Webhook accepted"
          );
        }
      )
    );

    assert.equal(payload.level, "info");
    assert.equal(payload.service, "worker");
    assert.equal(payload.message, "Webhook accepted");
    assert.equal(payload.event, "billing.webhook.received");
    assert.equal(payload.requestId, "req_123");
    assert.equal(payload.traceId, "trace_123");
    assert.equal(payload.tenantId, "tenant_123");
    assert.equal(payload.userId, "user_123");
    assert.equal(payload.jobId, "job_123");
    assert.deepEqual(payload.context, { phase: "webhook" });
    assert.ok(typeof payload.timestamp === "string");
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.LOG_LEVEL = previousLogLevel;
  }
});
