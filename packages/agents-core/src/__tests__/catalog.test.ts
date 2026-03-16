import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalizeAgentId,
  findManifestCatalogEntryByAgentId
} from "../manifest/catalog.js";
import { parseAgentManifest } from "../manifest/parser.js";
import { MANIFEST_VERSION } from "../manifest/schema.js";

const manifest = parseAgentManifest({
  agent: {
    changelog: ["Initial release"],
    description: "Customer success follow-up agent",
    id: "pos-venda",
    kind: "agent",
    name: "Pos Venda",
    prompt: "Act as a post-sale operator.",
    tenantId: "catalog",
    version: "1.0.0"
  },
  keywords: ["customer-success", "retention", "handoff", "renewal", "support"],
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
      description: "Coordinate post-sale execution",
      id: "skill-1",
      inputSchema: { type: "object" },
      name: "Post-sale",
      outputSchema: { type: "object" }
    }
  ],
  tags: {
    "use-case": ["retention"],
    domain: ["customer-success"],
    industry: ["saas"],
    level: ["specialist"],
    persona: ["csm"]
  },
  tools: [
    {
      description: "Track CRM state",
      id: "tool-1",
      inputSchema: { type: "object" },
      name: "CRM Tool",
      outputSchema: { type: "object" },
      timeoutMs: 1000
    }
  ]
});

void test("canonicalizeAgentId normalizes underscores and spaces", () => {
  assert.equal(canonicalizeAgentId("pos_venda"), "pos-venda");
  assert.equal(canonicalizeAgentId(" Pos Venda "), "pos-venda");
});

void test("findManifestCatalogEntryByAgentId resolves normalized aliases", () => {
  const entry = findManifestCatalogEntryByAgentId(
    [
      {
        manifest,
        manifestPath: "/tmp/agent-packs/pos-venda/manifest.json"
      }
    ],
    "pos_venda"
  );

  assert.ok(entry);
  assert.equal(entry?.manifest.agent.id, "pos-venda");
});
