# Production Readiness Pack - 2026-03-16

## Objetivo
Transformar o bloqueio de "deploy real" em um processo executável para staging e produção.

## Fonte de verdade do monorepo

- Contrato executável: [`scripts/ci/workspace-contract.json`](C:/Users/Marks/Documents/GitHub/BIRTHUB-360-INNOVATION/scripts/ci/workspace-contract.json)
- Auditoria automatizada: [`scripts/ci/workspace-audit.mjs`](C:/Users/Marks/Documents/GitHub/BIRTHUB-360-INNOVATION/scripts/ci/workspace-audit.mjs)
- Decisão arquitetural: [`ADR-031-monorepo-source-of-truth.md`](C:/Users/Marks/Documents/GitHub/BIRTHUB-360-INNOVATION/docs/adrs/ADR-031-monorepo-source-of-truth.md)

## Comandos obrigatórios antes de qualquer staging

1. `docker compose up -d postgres redis`
2. `pnpm workspace:audit`
3. `pnpm ci:security-guardrails`
4. `pnpm ci:full`
5. `pnpm release:preflight:staging -- --env-file=.env.staging`
6. `pnpm release:smoke -- --output=artifacts/release/staging-smoke-summary.json`

## Inventário mínimo de segredos

### API
- `DATABASE_URL`
- `REDIS_URL`
- `SESSION_SECRET`
- `AUTH_MFA_ENCRYPTION_KEY`
- `JOB_HMAC_GLOBAL_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SENTRY_DSN`
- `API_CORS_ORIGINS`
- `WEB_BASE_URL`

Nota:
Em `staging`, o Stripe pode usar chave de teste endurecida (`sk_test_`) sem placeholder.
Em `production`, o guardrail exige chave live (`sk_live_`).

### Web
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_CSP_REPORT_ONLY=false`
- `NEXT_PUBLIC_ENVIRONMENT=staging` em staging e `production` em produção

### Worker
- `DATABASE_URL`
- `REDIS_URL`
- `JOB_HMAC_GLOBAL_SECRET`
- `SENTRY_DSN`
- `WEB_BASE_URL`

## Staging Go/No-Go

- `workspace:audit` verde
- `ci:security-guardrails` verde
- `ci:full` verde
- `release:preflight:staging` verde com segredos reais de staging
- smoke de release verde
- healthchecks de `web`, `api` e `worker` respondendo 200
- Sentry e observabilidade recebendo eventos

## Beta Gate

- 1 fluxo crítico validado: login -> criar organização -> billing -> executar agente/workflow -> visualizar saída
- 5 tenants beta com onboarding assistido
- erros P1/P2 zerados por 7 dias
- rollback testado com evidência em staging
