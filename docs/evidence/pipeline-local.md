# Ciclo 1 — Pipeline Local

## 1) Diagnóstico
- **Problema encontrado:** o pipeline local precisava ser validado ponta a ponta para confirmar reprodutibilidade do monorepo.
- **Causa raiz:** ausência de evidência consolidada desta execução no ciclo atual.
- **Impacto:** sem essa validação, falhas de integração poderiam aparecer apenas em CI.

## 2) Plano
- Executar a sequência obrigatória localmente: `pnpm install`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`.
- Registrar sucesso/falha de cada etapa com foco em causa raiz.

## 3) Execução
- Comandos executados com sucesso:
  - `pnpm install`
  - `pnpm build`
  - `pnpm test`
  - `pnpm typecheck`
- Comando com falha:
  - `pnpm lint` (falha concentrada no pacote `@birthub/api` com violações de tipagem/segurança e `no-floating-promises`).

## 4) Validação
- `pnpm install` ✅
- `pnpm build` ✅
- `pnpm test` ✅
- `pnpm lint` ❌
- `pnpm typecheck` ✅

## 5) Evidência
- Este arquivo: `docs/evidence/pipeline-local.md`.
