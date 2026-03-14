import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadManifestCatalog } from "@birthub/agents-core";

void test("corporate-v1 possui manifests carregaveis", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const catalogRoot = path.resolve(path.dirname(currentFile), "..");
  const catalog = await loadManifestCatalog(catalogRoot);
  assert.ok(catalog.length >= 12);
});
