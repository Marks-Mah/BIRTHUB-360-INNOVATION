# Ciclo 2 - Lint Global

## 1) Diagnostico

- Problema encontrado: o baseline de lint ja tinha sido recuperado, mas faltava consolidar a evidencia final sem markers de merge e refletindo os ajustes recentes em `apps/web` e `apps/worker`.
- Causa raiz: o arquivo de evidencia ficou preso em duas narrativas de ciclos diferentes.
- Impacto: rastreabilidade operacional incompleta para o gate `pnpm lint`.

## 2) Plano

- Preservar o historico util do cleanup no `@birthub/api`.
- Acrescentar as correcoes mais recentes que destravaram lint/build do `@birthub/web` e o teste do worker.
- Revalidar o lint global com o baseline atual.

## 3) Execucao

- Mantidas as correcoes que zeraram o lint do `@birthub/api`.
- Ajustado `apps/web/tsconfig.json` para resolver `@birthub/config` e `@birthub/workflows-core` sem depender de artefatos `dist` preexistentes.
- Atualizados `packages/config/package.json` e `packages/workflows-core/package.json` para expor tipos a partir de `src`, mantendo import runtime em `dist`.
- Corrigido `apps/worker/src/worker.ts` para assinar o payload canonico completo dos jobs legados, fechando a falha de teste que contaminava a rodada de validacao.

## 4) Validacao

- `pnpm lint`: OK
- `pnpm typecheck`: OK
- `pnpm --filter @birthub/worker test`: OK

## 5) Evidencia

- Ajustes de import/tipos: `apps/web/tsconfig.json`, `packages/config/package.json`, `packages/workflows-core/package.json`
- Ajuste do worker: `apps/worker/src/worker.ts`
