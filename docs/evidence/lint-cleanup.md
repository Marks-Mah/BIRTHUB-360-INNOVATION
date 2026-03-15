# Ciclo 2 — Lint Global

## 1) Diagnóstico
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
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
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
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
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs

## 5) Evidência
- Este arquivo: `docs/evidence/lint-cleanup.md`.
