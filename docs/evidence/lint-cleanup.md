# Ciclo 2 — Lint Global

## 1) Diagnóstico
- **Problema encontrado:** `pnpm lint` falhava com 48 erros iniciais no `@birthub/api`.
- **Causa raiz:** uso de `any`, `no-floating-promises`, `no-base-to-string`, `no-unsafe-argument`, `no-implied-eval` e variáveis/imports não usados.
- **Impacto:** bloqueio de qualidade estática e risco de regressões no CI.

## 2) Plano
- Corrigir violações com mudanças tipadas e seguras, sem desabilitar regras.
- Fechar completamente o lint global (`pnpm lint` verde).

## 3) Execução
- Substituição de pontos com `any` por tipagem explícita e narrowing seguro.
- Ajustes em rotas para parse explícito com schemas Zod antes de chamadas de serviço.
- Correções de `no-floating-promises` em testes de isolamento.
- Remoção de import dinâmico via `Function` no auth crypto.
- Ajustes de serialização segura para JSON/CSV e remoção de código morto.

## 4) Validação
- `pnpm --filter @birthub/api exec eslint .` ✅
- `pnpm lint` ✅

## 5) Evidência
- Este arquivo: `docs/evidence/lint-cleanup.md`.
