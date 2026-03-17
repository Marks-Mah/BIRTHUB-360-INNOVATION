# BirthHub 360 Monorepo

Repositório canônico da plataforma SaaS BirthHub 360.

## Stack canônica suportada

- **Frontend oficial:** `apps/web` (Next.js + BFF em `app/api/bff`).
- **API oficial:** `apps/api` (Express modular, OpenAPI, auth, billing, workflows).
- **Worker oficial:** `apps/worker`.
- **Banco canônico:** `packages/database` (Prisma schema + migrations).

## Legado/deprecação controlada

- `apps/dashboard`: legado, não é a UI oficial para novos fluxos.
- `apps/api-gateway`: compat/proxy layer legado para cutover.
- `packages/db`: camada de compatibilidade temporária para migração de imports.

## Setup rápido

```bash
pnpm install
pnpm db:generate
pnpm monorepo:doctor
pnpm dev
```

## Portas locais padrão

- API: `3000`
- Web canônica: `3001`
- Dashboard legado: `3010`

## Comandos essenciais

```bash
pnpm monorepo:doctor      # valida duplicidades críticas e drift
pnpm release:scorecard    # gate técnico de release
pnpm lint
pnpm typecheck
pnpm test
```

## Governança e arquitetura

- Arquitetura canônica: `docs/ARQUITETURA_CANONICA.md`
- Migração de banco: `docs/MIGRACAO_CANONICA_DB.md`
- Deprecação/cutover: `docs/DEPRECACAO_E_CUTOVER.md`
- Observabilidade/SLOs: `docs/OBSERVABILIDADE_E_SLOS.md`
- Auditoria/aprovações: `docs/AUDITORIA_E_APROVACOES.md`
- LGPD operacional: `docs/LGPD_OPERACIONAL.md`
