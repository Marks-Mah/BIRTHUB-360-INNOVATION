# Staging Validation Runbook - 2026-03-16

## Objetivo
Executar um deploy de staging com infraestrutura real e validar o caminho critico antes do beta.

## Estado atual validado neste repositório

- `pnpm ci:full` verde em 2026-03-16.
- `pnpm ci:security-guardrails` verde ate `@birthub/database db:migrate:deploy`; o bloqueio restante e `DATABASE_URL` real ausente no ambiente.
- `pnpm release:preflight:staging -- --env-file=.env.example` gera evidencias em [`artifacts/release/staging-preflight-summary.json`](C:/Users/Marks/Documents/GitHub/BIRTHUB-360-INNOVATION/artifacts/release/staging-preflight-summary.json) e [`artifacts/release/staging-preflight-summary.txt`](C:/Users/Marks/Documents/GitHub/BIRTHUB-360-INNOVATION/artifacts/release/staging-preflight-summary.txt).

## Entradas obrigatorias

- Postgres gerenciado com `sslmode=require`.
- Redis gerenciado com TLS (`rediss://` ou `tls=true`).
- URLs publicas HTTPS para `web`, `api` e callbacks de billing.
- `SENTRY_DSN` para API e worker, `NEXT_PUBLIC_SENTRY_DSN` para web.
- segredos nao-placeholder para `SESSION_SECRET`, `AUTH_MFA_ENCRYPTION_KEY`, `JOB_HMAC_GLOBAL_SECRET`, `NEXTAUTH_SECRET`.
- Stripe de staging:
  pode usar `sk_test_`, mas nao pode usar placeholder.

## Sequencia de deploy

1. Popular segredos de staging usando [`infra/terraform/staging.tfvars.example`](C:/Users/Marks/Documents/GitHub/BIRTHUB-360-INNOVATION/infra/terraform/staging.tfvars.example) como baseline.
2. Exportar `DATABASE_URL` e `DIRECT_DATABASE_URL` reais.
3. Rodar `pnpm ci:security-guardrails`.
4. Rodar `pnpm ci:full`.
5. Rodar `pnpm release:preflight:staging -- --env-file=.env.staging`.
6. Rodar `pnpm release:smoke -- --output=artifacts/release/staging-smoke-summary.json`.

## Caminho critico que precisa ficar verde

1. Login com sessao persistida e CSRF valido.
2. Criacao ou selecao de organizacao com membership correto.
3. Checkout ou portal de billing em modo staging.
4. Execucao de agente ou workflow com escrita em fila.
5. Persistencia e visualizacao de output.
6. Evento correspondente no Sentry e logs estruturados em `api` e `worker`.
7. Healthchecks de `web`, `api` e `worker` respondendo 200.

## Evidencias minimas

- resumo do preflight em `artifacts/release/staging-preflight-summary.json`;
- resumo do smoke em `artifacts/release/staging-smoke-summary.json`;
- screenshot ou video curto do fluxo login -> billing -> output;
- link do issue ou change ticket com horario do deploy e responsavel.

## Go/No-Go

- Go:
  nenhum P1/P2 aberto, smoke verde, Sentry recebendo eventos, backlog de fila estavel.
- No-Go:
  callback de billing falhando, healthcheck instavel, fila acumulando, ou erro 5xx no fluxo critico.
