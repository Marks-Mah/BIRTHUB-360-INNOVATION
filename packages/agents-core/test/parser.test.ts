import assert from "node:assert/strict";
import test from "node:test";

import { AgentManifestParseError, parseAgentManifest } from "../src/parser/manifestParser.js";
import { SUPPORTED_AGENT_API_VERSION } from "../src/schemas/manifest.schema.js";

const validManifest = {
  apiVersion: SUPPORTED_AGENT_API_VERSION,
  version: "1.0.0",
  name: "Responder Agent",
  system_prompt: "You are a helpful assistant.",
  memory_ttl: 3600,
  restrictions: {
    allowDomains: ["api.birthhub.local"],
    allowTools: ["http", "db-read"],
    denyTools: ["db-write"],
    maxSteps: 6,
    maxTokens: 4096
  },
  skills: [{ id: "skill-classify", version: "1.0.0" }],
  tags: ["support"],
  tools: [{ id: "http", maxCalls: 3, timeoutMs: 1000 }]
};

void test("manifest parser accepts a valid manifest", () => {
  const parsed = parseAgentManifest(validManifest);
  assert.equal(parsed.name, "Responder Agent");
  assert.equal(parsed.skills[0]?.id, "skill-classify");
});

void test("manifest parser rejects invalid manifest with descriptive path", () => {
  assert.throws(
    () =>
      parseAgentManifest({
        ...validManifest,
        tools: [{ id: "", maxCalls: 3, timeoutMs: 1000 }]
      }),
    (error: unknown) => {
      assert.ok(error instanceof AgentManifestParseError);
      assert.match(error.message, /tools\.0\.id/);
      return true;
    }
  );
});

void test("manifest parser rejects partial manifest", () => {
  assert.throws(
    () =>
      parseAgentManifest({
        apiVersion: SUPPORTED_AGENT_API_VERSION,
        name: "Partial Agent"
      }),
    (error: unknown) => {
      assert.ok(error instanceof AgentManifestParseError);
      assert.match(error.message, /version/);
      assert.match(error.message, /system_prompt/);
      assert.match(error.message, /skills/);
      return true;
    }
  );
});

void test("manifest parser maps tools invalid_type to friendly message", () => {
  assert.throws(
    () =>
      parseAgentManifest({
        ...validManifest,
        tools: "not-an-array"
      }),
    (error: unknown) => {
      assert.ok(error instanceof AgentManifestParseError);
      assert.match(error.message, /O campo 'tools' precisa ser um array\./);
      return true;
    }
  );
});

void test("manifest parser rejects unsupported apiVersion greater than supported", () => {
  assert.throws(
    () =>
      parseAgentManifest({
        ...validManifest,
        apiVersion: "2.0.0"
      }),
    (error: unknown) => {
      assert.ok(error instanceof AgentManifestParseError);
      assert.match(error.message, /apiVersion/);
      assert.match(error.message, /2\.0\.0/);
      return true;
    }
  );
});
