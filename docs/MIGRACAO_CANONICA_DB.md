# Migração canônica de banco

## Origem e destino
- Origem: `@birthub/db` (legado).
- Destino: `@birthub/database` (canônico).

## Mudanças realizadas
- Imports migrados em `apps/api-gateway`, `apps/agent-orchestrator`, `apps/dashboard`.
- `packages/db` mantido como shim (`export * from '@birthub/database'`).

## Validação
- `pnpm db:generate`
- `pnpm monorepo:doctor`

## Cutover
1. Proibir novos imports `@birthub/db` (doctor/CI).
2. Migrar remanescentes.
3. Remover `packages/db`.
