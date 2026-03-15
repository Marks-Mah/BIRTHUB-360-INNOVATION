import assert from "node:assert/strict";
import test from "node:test";

import { WorkflowTransitionRoute } from "@birthub/database";

import { calculateBackoff, shouldFollowTransition } from "./runner.js";

void test("Runner routes condition branch to THEN path when result=true", () => {
  const output = { result: true };
  assert.equal(
    shouldFollowTransition(WorkflowTransitionRoute.IF_TRUE, output, false),
    true
  );
  assert.equal(
    shouldFollowTransition(WorkflowTransitionRoute.IF_FALSE, output, false),
    false
  );
});

void test("Runner routes condition branch to ELSE path when result=false", () => {
  const output = { result: false };
  assert.equal(
    shouldFollowTransition(WorkflowTransitionRoute.IF_TRUE, output, false),
    false
  );
  assert.equal(
    shouldFollowTransition(WorkflowTransitionRoute.IF_FALSE, output, false),
    true
  );
});

void test("Runner only follows failure routes when step fails", () => {
  assert.equal(
    shouldFollowTransition(WorkflowTransitionRoute.ON_FAILURE, null, true),
    true
  );
  assert.equal(
    shouldFollowTransition(WorkflowTransitionRoute.FALLBACK, null, true),
    true
  );
  assert.equal(
    shouldFollowTransition(WorkflowTransitionRoute.ALWAYS, null, true),
    false
  );
});

void test("Runner retry backoff is exponential and capped", () => {
  assert.equal(calculateBackoff(1), 2000);
  assert.equal(calculateBackoff(2), 4000);
  assert.equal(calculateBackoff(8), 60000);
});

