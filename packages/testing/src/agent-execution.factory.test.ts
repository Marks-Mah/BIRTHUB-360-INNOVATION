import assert from "node:assert/strict";
import test from "node:test";

import { createInvalidMockAgentExecution, createMockAgentExecution } from "./agent-execution.factory.js";

void test("createMockAgentExecution builds completed execution with output", () => {
  const execution = createMockAgentExecution({ status: "COMPLETED" });
  assert.equal(execution.status, "COMPLETED");
  assert.ok(execution.output);
  assert.ok(execution.finishedAt);
});

void test("createMockAgentExecution builds failed execution with error", () => {
  const execution = createMockAgentExecution({ status: "FAILED" });
  assert.equal(execution.status, "FAILED");
  assert.ok(execution.error);
});

void test("createInvalidMockAgentExecution emits invalid status", () => {
  const execution = createInvalidMockAgentExecution();
  assert.equal(execution.status, "INVALID");
});
