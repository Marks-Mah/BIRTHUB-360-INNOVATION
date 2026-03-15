# Ciclo 1 — Pipeline Local

## 1) Diagnóstico
- **Problema encontrado:** o pipeline local estava incompleto porque `pnpm lint` falhava no `apps/api`.
- **Causa raiz:** violações de lint ligadas a `any`, argumentos inseguros, `no-floating-promises`, stringificação insegura e imports dinâmicos inseguros.
- **Impacto:** pipeline local não fechava em verde e bloqueava a prontidão para CI.

## 2) Plano
- Corrigir os erros de lint sem enfraquecer tipagem.
- Reexecutar obrigatoriamente: `pnpm install`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`.

## 3) Execução
- Corrigidos os erros no `apps/api` (código de produção e testes), mantendo tipagem estrita.
- Sequência obrigatória reexecutada integralmente.

## 4) Validação
- `pnpm install` ✅
- `pnpm build` ✅
- `pnpm test` ✅
- `pnpm lint` ✅
- `pnpm typecheck` ✅

## 5) Evidência
- Este arquivo: `docs/evidence/pipeline-local.md`.
