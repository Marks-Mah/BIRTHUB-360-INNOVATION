import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  isInstallableManifest,
  loadManifestCatalog,
  runAgentDryRun
} from "@birthub/agents-core";

const SHARED_LEARNING_CLAUSE = "Todo agente aprende com todo agente.";

void test("pack regression: every manifest produces stable dry-run envelope", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const packageRoot = path.resolve(path.dirname(currentFile), "..");
  const catalogRoot = packageRoot;
  const catalog = await loadManifestCatalog(catalogRoot);

  for (const entry of catalog) {
    assert.ok(entry.manifest.agent.prompt.length >= 10);

    const result = await runAgentDryRun(entry.manifest);
    const output = JSON.parse(result.output) as { agentId: string; tools: string[] };

    assert.equal(output.agentId, entry.manifest.agent.id);
    assert.ok(output.tools.length >= 1);
  }
});

void test("official collection regression: installable manifests keep keywords and shared learning contract", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const packageRoot = path.resolve(path.dirname(currentFile), "..");
  const catalog = await loadManifestCatalog(packageRoot);

  for (const entry of catalog.filter((item) => isInstallableManifest(item.manifest))) {
    assert.ok(entry.manifest.keywords.length >= 8);
    assert.ok(entry.manifest.agent.prompt.includes("IDENTIDADE E MISSAO"));
    assert.ok(entry.manifest.agent.prompt.includes("MODO DE OPERACAO AUTONOMA"));
    assert.ok(entry.manifest.agent.prompt.includes("ROTINA DE MONITORAMENTO E ANTECIPACAO"));
    assert.ok(entry.manifest.agent.prompt.includes("CRITERIOS DE ESCALACAO"));
    assert.ok(entry.manifest.agent.prompt.includes("APRENDIZADO COMPARTILHADO"));
    assert.ok(
      entry.manifest.agent.prompt.includes("nunca esperar um risco relevante virar incidente para alertar")
    );
    assert.ok(entry.manifest.agent.prompt.includes(SHARED_LEARNING_CLAUSE));
  }
});
