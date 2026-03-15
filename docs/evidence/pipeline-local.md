# Ciclo 1 — Pipeline Local

## 1) Diagnóstico
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
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
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
- **Problema encontrado:** o pipeline local estava incompleto porque `pnpm lint` falhava no `apps/api`.
- **Causa raiz:** violações de lint ligadas a `any`, argumentos inseguros, `no-floating-promises`, stringificação insegura e imports dinâmicos inseguros.
- **Impacto:** pipeline local não fechava em verde e bloqueava a prontidão para CI.

## 2) Plano
- Corrigir os erros de lint sem enfraquecer tipagem.
- Reexecutar obrigatoriamente: `pnpm install`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`.

## 3) Execução
- Corrigidos os erros no `apps/api` (código de produção e testes), mantendo tipagem estrita.
- Sequência obrigatória reexecutada integralmente.
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

## 4) Validação
- `pnpm install` ✅
- `pnpm build` ✅
- `pnpm test` ✅
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
- `pnpm lint` ❌
=======
- `pnpm lint` ✅
>>>>>>> theirs
=======
- `pnpm lint` ✅
>>>>>>> theirs
=======
- `pnpm lint` ✅
>>>>>>> theirs
=======
- `pnpm lint` ✅
>>>>>>> theirs
=======
- `pnpm lint` ✅
>>>>>>> theirs
- `pnpm typecheck` ✅

## 5) Evidência
- Este arquivo: `docs/evidence/pipeline-local.md`.
