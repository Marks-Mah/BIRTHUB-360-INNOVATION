import assert from "node:assert/strict";
import test from "node:test";
import { contractRegistry, LeadLifecycleInput, LeadLifecycleOutput } from "./internal-contracts.js";

test("contrato lead lifecycle possui versões de I/O", () => {
  assert.equal(contractRegistry.leadLifecycle.inputSchemaVersion, "v1");
  assert.equal(contractRegistry.leadLifecycle.outputSchemaVersion, "v1");
});

test("tipos de contrato suportam payload crítico", () => {
  const input: LeadLifecycleInput = {
    schemaVersion: "v1",
    leadId: "lead-1",
    context: { source: "ads" },
  };

  const output: LeadLifecycleOutput = {
    schemaVersion: "v1",
    status: "completed",
    actionsTaken: ["ldr_enrich_completed"],
    score: 85,
    tier: "T2",
  };

  assert.equal(input.schemaVersion, output.schemaVersion);
});
