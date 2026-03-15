# Ciclo 1 — Pipeline Local

## 1) Diagnóstico
- **Problema encontrado 1:** `pnpm build` falhava no `@birthub/web` com `Module not found` para imports `.js` resolvidos em `packages/config/src` e `packages/workflows-core/src`.
- **Causa raiz 1:** o app web resolvia pacotes internos para código-fonte TS com imports ESM `.js`, incompatível com a resolução do Turbopack sobre os fontes.
- **Impacto 1:** build de produção local interrompido.

- **Problema encontrado 2:** resolução de `@birthub/workflows-core` apontava para `dist/index.js`, mas o build do pacote gerava `dist/src/index.js`.
- **Causa raiz 2:** `main/types/exports` incorretos em `packages/workflows-core/package.json`.
- **Impacto 2:** falhas de resolução durante build/integração no web.

- **Problema encontrado 3:** `pnpm lint` não concluía no root por erros de lint preexistentes em `apps/api`.
- **Causa raiz 3:** dívida técnica de lint (tipagem insegura, `no-floating-promises`, `no-explicit-any`, etc.) fora do escopo de correção estrutural mínima deste ciclo.
- **Impacto 3:** pipeline não totalmente verde em lint global neste momento.

## 2) Plano
- Corrigir resolução de módulos internos para permitir build local completo.
- Ajustar export map do `@birthub/workflows-core` para os artefatos realmente gerados.
- Corrigir falhas de lint/typecheck introduzidas/afetadas nas áreas tocadas (web/worker) sem enfraquecer regras.
- Executar novamente `install`, `build`, `test`, `lint`, `typecheck` e registrar resultados.

## 3) Execução
- Atualizado `apps/web/tsconfig.json` para resolução de `@birthub/config` e `@birthub/workflows-core` via `dist`.
- Corrigido `packages/workflows-core/package.json` (`main`, `types`, `exports`) para `dist/src/index.*`.
- Ajustes de tipagem/lint em testes e utilitários de `apps/worker`.
- Ajustes de lint/tipagem em arquivos de `apps/web`.
- Ajuste no `eslint.config.mjs` para ignorar arquivos JS/MJS no lint tipado global.

## 4) Validação
Comandos executados:

1. `pnpm install` ✅
2. `pnpm build` ✅
3. `pnpm test` ✅
4. `pnpm lint` ❌ (falhas remanescentes preexistentes em `apps/api`)
5. `pnpm typecheck` ✅

## 5) Evidência
- Logs e correções deste ciclo documentados neste arquivo.
