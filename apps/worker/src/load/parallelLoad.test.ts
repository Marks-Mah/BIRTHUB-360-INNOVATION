import assert from "node:assert/strict";
import test from "node:test";

import { runParallelExecutionLoadTest } from "./parallelLoad.js";

void test("worker handles 50 parallel executions without dropping jobs", async () => {
  const metrics = await runParallelExecutionLoadTest(50);

  assert.equal(metrics.successCount, 50);
  assert.ok(metrics.totalMs >= 0);
  assert.ok(metrics.p95Ms >= metrics.p50Ms);
  assert.ok(metrics.p99Ms >= metrics.p95Ms);
});
