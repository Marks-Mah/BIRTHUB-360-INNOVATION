import assert from "node:assert/strict";
import test from "node:test";

import { AgentManifestParseError, parseAgentManifest } from "../manifest/parser.js";
import { MANIFEST_VERSION } from "../manifest/schema.js";

const validManifest = {
  agent: {
    changelog: ["Initial release"],
    description: "Agent description",
    id: "agent-1",
    kind: "agent",
    name: "Agent One",
    prompt: "Act as a strategic operator.",
    tenantId: "tenant-1",
    version: "1.0.0"
  },
  keywords: ["strategy", "planning", "forecast", "analysis", "governance"],
  manifestVersion: MANIFEST_VERSION,
  policies: [
    {
      actions: ["tool:execute"],
      effect: "allow",
      id: "policy-1",
      name: "Default policy"
    }
  ],
  skills: [
    {
      description: "Skill description",
      id: "skill-1",
      inputSchema: { type: "object" },
      name: "Skill One",
      outputSchema: { type: "object" }
    }
  ],
  tags: {
    "use-case": ["forecast"],
    domain: ["finance"],
    industry: ["saas"],
    level: ["c-level"],
    persona: ["cfo"]
  },
  tools: [
    {
      description: "Tool description",
      id: "tool-1",
      inputSchema: { type: "object" },
      name: "Tool One",
      outputSchema: { type: "object" },
      timeoutMs: 1000
    }
  ]
};

void test("parseAgentManifest accepts valid manifest", () => {
  const parsed = parseAgentManifest(validManifest);
  assert.equal(parsed.agent.id, "agent-1");
});

void test("parseAgentManifest returns descriptive error for invalid manifest", () => {
  assert.throws(
    () =>
      parseAgentManifest({
        ...validManifest,
        tools: [
          {
            ...validManifest.tools[0],
            timeoutMs: -2
          }
        ]
      }),
    (error: unknown) => {
      assert.ok(error instanceof AgentManifestParseError);
      const err = error as AgentManifestParseError;
      assert.match(err.message, /tools.0.timeoutMs/);
      return true;
    }
  );
});

void test("parseAgentManifest rejects partial manifest", () => {
  assert.throws(
    () =>
      parseAgentManifest({
        agent: validManifest.agent,
        manifestVersion: MANIFEST_VERSION
      }),
    (error: unknown) => {
      assert.ok(error instanceof AgentManifestParseError);
      const err = error as AgentManifestParseError;
      assert.match(err.message, /skills/);
      assert.match(err.message, /tools/);
      assert.match(err.message, /policies/);
      assert.match(err.message, /tags/);
      return true;
    }
  );
});

void test("parseAgentManifest rejects incompatible version", () => {
  assert.throws(
    () =>
      parseAgentManifest({
        ...validManifest,
        manifestVersion: "2.0.0"
      }),
    (error: unknown) => {
      assert.ok(error instanceof AgentManifestParseError);
      const err = error as AgentManifestParseError;
      assert.match(err.message, /versao incompativel/);
      return true;
    }
  );
});

void test("parseAgentManifest rejects unexpected keys at the manifest root", () => {
  assert.throws(
    () =>
      parseAgentManifest({
        ...validManifest,
        roguePayload: {
          enabled: true
        }
      }),
    (error: unknown) => {
      assert.ok(error instanceof AgentManifestParseError);
      const err = error as AgentManifestParseError;
      assert.match(err.message, /roguePayload/);
      return true;
    }
  );
});

void test("parseAgentManifest rejects unexpected nested keys inside agent descriptors", () => {
  assert.throws(
    () =>
      parseAgentManifest({
        ...validManifest,
        agent: {
          ...validManifest.agent,
          injectedPromptVars: ["SYSTEM_OVERRIDE"]
        }
      }),
    (error: unknown) => {
      assert.ok(error instanceof AgentManifestParseError);
      const err = error as AgentManifestParseError;
      assert.match(err.message, /agent/);
      assert.match(err.message, /injectedPromptVars/);
      return true;
    }
  );
});
