import test from "node:test";
import assert from "node:assert/strict";
import { t } from "../lib/platform-i18n.ts";

test("pt-BR é idioma padrão funcional", () => {
  assert.equal(t("pt-BR", "overview"), "Visão Geral");
});

test("fallback de chave inexistente retorna chave", () => {
  assert.equal(t("pt-BR", "chave_inexistente"), "chave_inexistente");
});
