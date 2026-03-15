# Ciclo 11 — Sanidade Next.js

## 1) Diagnóstico
- **Problema encontrado:** validar saúde da estrutura Next.js com App Router.
- **Causa raiz:** garantir que o build esteja íntegro com rotas estáticas/dinâmicas.
- **Impacto:** estrutura quebrada de rotas compromete deploy e navegação.

## 2) Plano
- Confirmar árvore de rotas via `next build` do pacote web.
- Verificar existência de `layout.tsx`, `global-error.tsx`, API routes e páginas segmentadas.

## 3) Execução
- Build concluído com sucesso e listagem completa de rotas, incluindo segmentos `(dashboard)` e rotas dinâmicas `[id]`.

## 4) Validação
- `pnpm --filter @birthub/web build` ✅

## 5) Evidência
- Este arquivo: `docs/evidence/next-structure.md`.
