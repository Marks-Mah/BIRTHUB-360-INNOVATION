# CI local reproduzível (fallback para bloqueio de billing no GitHub)

Enquanto o billing do GitHub Actions estiver bloqueado, use o pipeline local abaixo para validar o monorepo.

## Comando único

```bash
pnpm ci:local
```

## Script executado

`scripts/ci/local-ci.sh` roda, nesta ordem:

1. `pnpm install --frozen-lockfile`
2. `pnpm db:generate`
3. `pnpm build`
4. `pnpm lint`
5. `pnpm typecheck`
6. `pnpm test`
7. `pnpm test:e2e` (opcional com `RUN_E2E=1`)

## Variáveis padrão do pipeline local

O script define defaults compatíveis com o workflow de CI remoto:

- `DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/birthub_cycle1`
- `REDIS_URL=redis://localhost:6379`
- `NODE_ENV=test`
- `NEXT_PUBLIC_ENVIRONMENT=ci-local`
- `SESSION_SECRET=ci-local-secret`

## Observação

Este fluxo não substitui a validação remota, mas garante evidência técnica reproduzível até a normalização do billing.
