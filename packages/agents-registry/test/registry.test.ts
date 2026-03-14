import assert from "node:assert/strict";
import test from "node:test";

import { AgentRegistry, hashManifest, InMemoryAgentRegistryStore } from "../src/index.js";

void test("registry requires changelog for minor and major bumps", async () => {
  const registry = new AgentRegistry(new InMemoryAgentRegistryStore());

  await registry.createVersion({
    agentId: "agent-1",
    manifest: { name: "agent" },
    name: "Agent One",
    tenantId: "tenant-1",
    version: "1.0.0"
  });

  await assert.rejects(
    () =>
      registry.createVersion({
        agentId: "agent-1",
        manifest: { name: "agent" },
        name: "Agent One",
        tenantId: "tenant-1",
        version: "1.1.0"
      }),
    /Changelog is required/
  );
});

void test("registry computes deterministic SHA256 manifest digest", () => {
  const left = hashManifest({ b: 2, a: 1 });
  const right = hashManifest({ a: 1, b: 2 });
  assert.equal(left, right);
});

void test("registry rollback deprecates current and republishes target version", async () => {
  const registry = new AgentRegistry(new InMemoryAgentRegistryStore());

  await registry.createVersion({
    agentId: "agent-2",
    manifest: { step: 1 },
    name: "Agent Two",
    tenantId: "tenant-2",
    version: "1.0.0"
  });

  await registry.createVersion({
    agentId: "agent-2",
    changelog: "new capability",
    manifest: { step: 2 },
    name: "Agent Two",
    tenantId: "tenant-2",
    version: "1.1.0"
  });

  await registry.publishVersion("agent-2", "1.1.0", "tenant-2");
  const rolledBack = await registry.rollbackVersion({
    agentId: "agent-2",
    targetVersion: "1.0.0",
    tenantId: "tenant-2"
  });

  assert.equal(rolledBack.version, "1.0.0");
  assert.equal(rolledBack.status, "PUBLISHED");
});
