# Ciclo 2 — Lint Global

## 1) Diagnóstico
- **Problema encontrado:** `pnpm lint` falhando com 48 erros iniciais no `@birthub/api`.
- **Causa raiz:** mistura de `any`, argumentos inseguros, `no-floating-promises` em testes e asserções de tipo desnecessárias.
- **Impacto:** bloqueio da qualidade estática e risco de regressões no CI.

## 2) Plano
- Corrigir automaticamente o que for seguro com ESLint `--fix`.
- Remover asserções redundantes (`no-unnecessary-type-assertion`) sem enfraquecer tipagem.
- Registrar pendências residuais para próximos commits menores.

## 3) Execução
- Rodado: `pnpm --filter @birthub/api exec eslint . --fix`.
- Ajustes aplicados automaticamente:
  - remoção de type assertions desnecessárias em `apps/api/src/modules/webhooks/stripe.router.ts`;
  - remoção de assertion desnecessária em `apps/api/tests/marketplace-budget.smoke.test.ts`.
- Resultado parcial: total caiu de 48 para 42 erros.

## 4) Validação
- `pnpm lint` ❌ (ainda com erros remanescentes em `@birthub/api`).
- `pnpm --filter @birthub/api exec eslint . --fix` ⚠️ (corrige parte, não zera).

## 5) Evidência
- Este arquivo: `docs/evidence/lint-cleanup.md`.
