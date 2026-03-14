import assert from "node:assert/strict";
import test from "node:test";

import { PolicyEngine } from "../src/policy/engine.js";

void test("policy engine grants access when matching allow rule exists", () => {
  const engine = new PolicyEngine([
    {
      action: "tool.http",
      effect: "allow",
      id: "allow-http"
    }
  ]);

  const result = engine.evaluate("agent-1", "tool.http", { tenantId: "tenant-1" });
  assert.equal(result.granted, true);
});

void test("policy engine denies access when deny and allow conflict", () => {
  const engine = new PolicyEngine([
    {
      action: "tool.*",
      effect: "allow",
      id: "allow-all"
    },
    {
      action: "tool.db-write",
      effect: "deny",
      id: "deny-write"
    }
  ]);

  const result = engine.evaluate("agent-1", "tool.db-write", { tenantId: "tenant-1" });
  assert.equal(result.granted, false);
  assert.equal(result.matchedRuleId, "deny-write");
});

void test("policy engine ignores disabled rules and falls back to default deny", () => {
  const engine = new PolicyEngine([
    {
      action: "tool.send-email",
      effect: "allow",
      enabled: false,
      id: "disabled-email"
    }
  ]);

  const result = engine.evaluate("agent-1", "tool.send-email", { tenantId: "tenant-1" });
  assert.equal(result.granted, false);
  assert.match(result.reason, /default policy/);
});
