import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateHealthScore,
  shouldEmitChurnRisk
} from "./healthScore.js";

void test("calculateHealthScore rewards active agent usage", () => {
  const score = calculateHealthScore({
    activeUsers: 5,
    agentRuns: 12,
    billingErrors: 0,
    loginCount: 9,
    runFailures: 0,
    workflowRuns: 4
  });

  assert.equal(score, 100);
});

void test("calculateHealthScore penalizes critical inactivity and billing failure", () => {
  const score = calculateHealthScore({
    activeUsers: 0,
    agentRuns: 0,
    billingErrors: 2,
    loginCount: 0,
    runFailures: 8,
    workflowRuns: 0
  });

  assert.equal(score, 15);
});

void test("shouldEmitChurnRisk only triggers on the threshold crossing", () => {
  assert.equal(shouldEmitChurnRisk(55, 39), true);
  assert.equal(shouldEmitChurnRisk(39, 20), false);
  assert.equal(shouldEmitChurnRisk(60, 40), false);
});
