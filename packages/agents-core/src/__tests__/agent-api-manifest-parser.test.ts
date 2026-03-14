import assert from "node:assert/strict";
import test from "node:test";

import { AgentManifestParseError, parseAgentManifest } from "../parser/manifestParser.js";
import { SUPPORTED_AGENT_API_VERSION } from "../schemas/manifest.schema.js";

const validManifest = {
  apiVersion: SUPPORTED_AGENT_API_VERSION,
  version: "1.0.0",
  name: "Responder Agent",
  restrictions: {
    allowDomains: ["api.birthhub.local"],
    allowTools: ["http", "db-read"],
    denyTools: ["db-write"],
    maxSteps: 6,
    maxTokens: 4096
  },
  skills: [{ id: "skill-classify", version: "1.0.0" }],
  system_prompt: "You are a support responder for tenant-safe workflows.",
  tags: ["support"],
  tools: [{ id: "http", maxCalls: 3, timeoutMs: 1000 }]
};

void test("agent api manifest parser accepts a valid manifest", () => {
  const parsed = parseAgentManifest(validManifest);
  assert.equal(parsed.name, "Responder Agent");
});

void test("agent api manifest parser rejects unexpected root keys", () => {
  assert.throws(
    () =>
      parseAgentManifest({
        ...validManifest,
        roguePayload: true
      }),
    (error: unknown) => {
      assert.ok(error instanceof AgentManifestParseError);
      assert.match(error.message, /roguePayload/);
      return true;
    }
  );
});

void test("agent api manifest parser rejects unexpected nested restriction keys", () => {
  assert.throws(
    () =>
      parseAgentManifest({
        ...validManifest,
        restrictions: {
          ...validManifest.restrictions,
          bypassBudget: true
        }
      }),
    (error: unknown) => {
      assert.ok(error instanceof AgentManifestParseError);
      assert.match(error.message, /restrictions/);
      assert.match(error.message, /bypassBudget/);
      return true;
    }
  );
});
