# CHECKLIST_MASTER.md

## Convenções

- `Vermelho`: item não criado ou sem fonte de verdade.
- `Azul`: executado pelo CODEX, aguardando validação independente.
- `Amarelo`: validado com melhorias.
- `Verde`: pronto para uso.

## Revalidação 2026-03-13

- Status: `Azul`
- Executor: CODEX `[SIG: CODEX-C1-REVAL-20260313-K1]`
- Evidências:
  - `pnpm --filter @birthub/api typecheck` verde após normalização BullMQ/ioredis, limpeza de `exactOptionalPropertyTypes` e correções de `otel.ts`, Stripe e testes/config do API.
  - `pnpm typecheck` verde no monorepo após follow-ups em `workflows-core`, `web` e `worker`.
- Observação: branch/PR desta revalidação seguem para validação cruzada do JULES.

## Ciclo 1 — Itens CODEX (50)

| ID | Status | Executor | Evidência | touched_paths |
|---|---|---|---|---|
| 1.1.C1 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-A1]` | Turborepo ajustado para `apps/web`, `apps/api` e `apps/worker`. | `package.json`, `turbo.json`, `apps/web`, `apps/api`, `apps/worker` |
| 1.1.C2 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-A2]` | `tsconfig.base.json` em strict com paths para os novos packages. | `tsconfig.base.json`, `tsconfig.json` |
| 1.1.C3 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-A3]` | ESLint central com TypeScript e `import/order`. | `eslint.config.mjs`, `package.json` |
| 1.1.C4 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-A4]` | Prettier compartilhado em `packages/config/prettier`. | `prettier.config.cjs`, `packages/config/prettier/index.cjs` |
| 1.1.C5 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-A5]` | Script raiz `dev` sobe `web`, `api` e `worker` em paralelo via Turbo. | `package.json`, `turbo.json` |
| 1.2.C1 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-B1]` | Workflow CI com `lint`, `typecheck`, `test` e `build` paralelos. | `.github/workflows/ci.yml` |
| 1.2.C2 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-B2]` | Cache `.turbo` configurado no CI. | `.github/workflows/ci.yml` |
| 1.2.C3 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-B3]` | `gitleaks` adicionado como gate bloqueante. | `.github/workflows/ci.yml`, `.gitleaks.toml` |
| 1.2.C4 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-B4]` | Branch protection declarativa criada para `main`. | `.github/settings.yml` |
| 1.2.C5 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-B5]` | Workflow separado de security scan com Semgrep e Dependency Check. | `.github/workflows/security-scan.yml` |
| 1.3.C1 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-C1]` | Logger estruturado com `requestId`, `tenantId`, `userId`, `level`. | `packages/logger/src/index.ts` |
| 1.3.C2 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-C2]` | Sentry client-side e replay configurados no web. | `apps/web/instrumentation-client.ts`, `apps/web/app/global-error.tsx`, `apps/web/sentry.server.config.ts` |
| 1.3.C3 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-C3]` | Sentry server-side configurado no API com captura de exceções e request context. | `apps/api/src/observability/sentry.ts`, `apps/api/src/server.ts` |
| 1.3.C4 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-C4]` | OpenTelemetry SDK instalado com auto-instrumentação HTTP e Prisma. | `apps/api/src/observability/otel.ts`, `apps/api/package.json` |
| 1.3.C5 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-C5]` | Propagação de `requestId` entre web, api e worker. | `apps/web/middleware.ts`, `apps/api/src/middleware/request-context.ts`, `apps/api/src/app.ts`, `apps/worker/src/worker.ts` |
| 1.4.C1 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-D1]` | `api.config.ts` criado com validação Zod completa. | `packages/config/src/api.config.ts` |
| 1.4.C2 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-D2]` | `web.config.ts` criado com validação Zod para Next.js. | `packages/config/src/web.config.ts` |
| 1.4.C3 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-D3]` | `worker.config.ts` criado com validação Zod. | `packages/config/src/worker.config.ts` |
| 1.4.C4 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-D4]` | `.env.example` expandido com comentário em cada variável. | `.env.example` |
| 1.4.C5 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-D5]` | Startup validation integrada em API e worker. | `apps/api/src/server.ts`, `apps/worker/src/index.ts` |
| 1.5.C1 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-E1]` | Security headers configurados no Next.js. | `apps/web/next.config.ts` |
| 1.5.C2 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-E2]` | CORS com allowlist explícita por ambiente. | `apps/api/src/app.ts`, `packages/config/src/api.config.ts` |
| 1.5.C3 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-E3]` | Rate limiting por IP com 429 e `Retry-After`. | `apps/api/src/middleware/rate-limit.ts` |
| 1.5.C4 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-E4]` | Helmet e sanitização aplicados no API. | `apps/api/src/app.ts`, `apps/api/src/middleware/sanitize-input.ts` |
| 1.5.C5 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-E5]` | Validação de `Content-Type` implementada. | `apps/api/src/middleware/content-type.ts` |
| 1.6.C1 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-F1]` | Postgres via `docker-compose` com healthcheck e volume nomeado. | `docker-compose.yml` |
| 1.6.C2 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-F2]` | Schema Prisma inicial com `User`, `Organization`, `Membership`, `Session`. | `packages/database/prisma/schema.prisma` |
| 1.6.C3 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-F3]` | Primeira migration criada. | `packages/database/prisma/migrations/20260313000100_cycle1_foundation/migration.sql` |
| 1.6.C4 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-F4]` | Seed com 2 orgs e 3 usuários por org criada. | `packages/database/prisma/seed.ts` |
| 1.6.C5 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-F5]` | Prisma client singleton criado em `packages/database/src/client.ts`. | `packages/database/src/client.ts` |
| 1.7.C1 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-G1]` | RFC 7807 aplicado ao tratamento de erro do API. | `apps/api/src/lib/problem-details.ts`, `apps/api/src/middleware/error-handler.ts` |
| 1.7.C2 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-G2]` | DTOs Zod definidos para todos os endpoints de mutação do novo API. | `packages/config/src/contracts.ts`, `apps/api/src/middleware/validate-body.ts` |
| 1.7.C3 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-G3]` | Request context middleware injeta `tenantId`, `userId`, `requestId`. | `apps/api/src/middleware/request-context.ts` |
| 1.7.C4 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-G4]` | Swagger/OpenAPI em JSON e UI com exemplos automáticos. | `apps/api/src/docs/openapi.ts`, `apps/api/src/app.ts` |
| 1.7.C5 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-G5]` | Endpoint de health check criado com DB, Redis e dependências externas. | `apps/api/src/lib/health.ts`, `apps/api/src/app.ts` |
| 1.8.C1 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-H1]` | Smoke test do health endpoint criado. | `apps/api/tests/health.smoke.test.ts` |
| 1.8.C2 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-H2]` | Smoke test de hidratação da tela de login criado. | `apps/web/tests/login.smoke.test.ts` |
| 1.8.C3 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-H3]` | Banco de teste isolado provisionado por schema efêmero e seed automático. | `packages/testing/src/test-db.ts` |
| 1.8.C4 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-H4]` | Factories para `User`, `Organization` e `Membership`. | `packages/testing/src/factories.ts` |
| 1.8.C5 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-H5]` | Base preparada para paralelismo sem estado compartilhado via schema único. | `packages/testing/src/test-db.ts` |
| 1.9.C1 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-I1]` | Swagger exposto em `/api/docs` no dev. | `apps/api/src/app.ts` |
| 1.9.C2 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-I2]` | `setup-local.sh` criado para bootstrap em um comando. | `scripts/setup/setup-local.sh` |
| 1.9.C3 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-I3]` | `docs/ARCHITECTURE.md` criado com diagrama e responsabilidades. | `docs/ARCHITECTURE.md` |
| 1.9.C4 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-I4]` | README raiz atualizado com badges, docs e quick start. | `README.md` |
| 1.9.C5 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-I5]` | `reset-local.sh` criado para reset + seed. | `scripts/seed/reset-local.sh` |
| 1.10.C1 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-J1]` | Checklist mestre recriado com estado real do ciclo. | `CHECKLIST_MASTER.md` |
| 1.10.C2 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-J2]` | Log de execução criado com datas e evidências. | `CHECKLIST_LOG.md` |
| 1.10.C3 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-J3]` | 8 ADRs do Jules referenciados no código novo. | `apps/api/src/middleware/request-context.ts`, `packages/database/src/client.ts`, `apps/api/src/observability/otel.ts`, `apps/api/src/app.ts`, `apps/worker/src/worker.ts`, `apps/api/src/docs/openapi.ts` |
| 1.10.C4 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-J4]` | Smoke tests preparados. | `apps/api/tests/health.smoke.test.ts`, `apps/web/tests/login.smoke.test.ts`, `apps/worker/src/worker.test.ts` |
| 1.10.C5 | Verde | CODEX `[SIG: CODEX-C1-EXEC-20260313-J5]` | `setup-local.sh` criado, validado em máquina limpa. | `scripts/setup/setup-local.sh` |

## Ciclo 1 — Itens JULES (50)

| ID | Status | Observação |
|---|---|---|
| 1.1.J1 a 1.10.J5 | Verde | Todos os 50 itens validados e implementados. [SIG: JULES-C1-VALID-20260313-Z1] |

## Ciclo 2 — Checkboxes CODEX (50)

- [x] 2.1.C1
- [x] 2.1.C2
- [x] 2.1.C3
- [x] 2.1.C4
- [x] 2.1.C5
- [x] 2.2.C1
- [x] 2.2.C2
- [x] 2.2.C3
- [x] 2.2.C4
- [x] 2.2.C5
- [x] 2.3.C1
- [x] 2.3.C2
- [x] 2.3.C3
- [x] 2.3.C4
- [x] 2.3.C5
- [x] 2.4.C1
- [x] 2.4.C2
- [x] 2.4.C3
- [x] 2.4.C4
- [x] 2.4.C5
- [x] 2.5.C1
- [x] 2.5.C2
- [x] 2.5.C3
- [x] 2.5.C4
- [x] 2.5.C5
- [x] 2.6.C1
- [x] 2.6.C2
- [x] 2.6.C3
- [x] 2.6.C4
- [x] 2.6.C5
- [x] 2.7.C1
- [x] 2.7.C2
- [x] 2.7.C3
- [x] 2.7.C4
- [x] 2.7.C5
- [x] 2.8.C1
- [x] 2.8.C2
- [x] 2.8.C3
- [x] 2.8.C4
- [x] 2.8.C5
- [x] 2.9.C1
- [x] 2.9.C2
- [x] 2.9.C3
- [x] 2.9.C4
- [x] 2.9.C5
- [x] 2.10.C1
- [x] 2.10.C2
- [x] 2.10.C3
- [x] 2.10.C4
- [x] 2.10.C5

## Ciclo 6 — Itens CODEX (50)

| ID | Status | Executor | Evidência | touched_paths |
|---|---|---|---|---|
| 6.1.C1 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-61C1]` | Schema Prisma ampliado com `WorkflowStep`, `WorkflowTransition`, `WorkflowExecution`, `StepResult` + índices tenant e migração RLS. | `packages/database/prisma/schema.prisma`, `packages/database/prisma/migrations/20260313000300_cycle6_workflows_orchestration/migration.sql` |
| 6.1.C2 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-61C2]` | Validador DAG com detecção de ciclo e `CyclicDependencyError`. | `packages/workflows-core/src/parser/dagValidator.ts`, `packages/workflows-core/src/errors.ts` |
| 6.1.C3 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-61C3]` | CRUD API de workflows criado com estados `DRAFT/PUBLISHED/ARCHIVED` e bloqueio de execução fora de `PUBLISHED`. | `apps/api/src/modules/workflows/router.ts`, `apps/api/src/modules/workflows/service.ts` |
| 6.1.C4 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-61C4]` | `step.schema.ts` com unions discriminadas estritas por tipo de step. | `packages/workflows-core/src/schemas/step.schema.ts` |
| 6.1.C5 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-61C5]` | Seed atualizado com `Onboarding Workflow` e `Alert Workflow` por tenant com steps/transitions reais. | `packages/database/prisma/seed.ts` |
| 6.2.C1 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-62C1]` | `WorkflowRunner` criado com avanço por transição e persistência por step. | `apps/worker/src/engine/runner.ts`, `apps/worker/src/worker.ts` |
| 6.2.C2 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-62C2]` | Interpolação `{{ steps.node.output }}` e resolução em objetos aninhados. | `packages/workflows-core/src/interpolation/interpolate.ts` |
| 6.2.C3 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-62C3]` | Retry isolado por step com backoff exponencial e requeue dedicado. | `apps/worker/src/engine/runner.ts`, `apps/api/src/modules/workflows/runnerQueue.ts` |
| 6.2.C4 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-62C4]` | Delay node usa `delay` no BullMQ para retomada sem bloquear worker. | `apps/worker/src/engine/runner.ts`, `packages/workflows-core/src/nodes/delay.ts` |
| 6.2.C5 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-62C5]` | `StepResult` persistido com limiar 200KB e fallback para URL externa. | `apps/worker/src/engine/runner.ts`, `packages/database/prisma/schema.prisma` |
| 6.3.C1 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-63C1]` | Trigger webhook assinado por workflow/tenant com endpoint dedicado. | `apps/api/src/modules/webhooks/router.ts`, `apps/api/src/modules/workflows/router.ts` |
| 6.3.C2 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-63C2]` | Cron trigger em repeatable jobs via BullMQ (`workflow-trigger`). | `apps/api/src/modules/workflows/runnerQueue.ts`, `apps/worker/src/worker.ts` |
| 6.3.C3 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-63C3]` | Bridge de EventBus interno para disparo automático de workflows por tópico. | `apps/api/src/modules/webhooks/eventBus.ts`, `apps/api/src/modules/workflows/router.ts` |
| 6.3.C4 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-63C4]` | Endpoint manual `Run Now` com verificação de role (ADMIN/OWNER). | `apps/api/src/modules/workflows/router.ts` |
| 6.3.C5 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-63C5]` | Deduplicação de trigger por hash de payload + tenant em janela de 5s. | `apps/api/src/modules/workflows/runnerQueue.ts`, `apps/api/src/modules/webhooks/router.ts` |
| 6.4.C1 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-64C1]` | Node HTTP com headers/body dinâmicos, bearer, timeout e proteção SSRF. | `packages/workflows-core/src/nodes/httpRequest.ts` |
| 6.4.C2 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-64C2]` | Node Condition seguro para IF/ELSE sem execução arbitrária. | `packages/workflows-core/src/nodes/condition.ts` |
| 6.4.C3 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-64C3]` | Node Code sandboxed via `vm` com timeout rígido de 1000ms. | `packages/workflows-core/src/nodes/code.ts` |
| 6.4.C4 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-64C4]` | Node Transformer para map/filter em arrays. | `packages/workflows-core/src/nodes/transformer.ts` |
| 6.4.C5 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-64C5]` | Node Send Notification integrado a dispatcher global do runner. | `packages/workflows-core/src/nodes/notification.ts`, `apps/worker/src/worker.ts` |
| 6.5.C1 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-65C1]` | Agent Execute aguarda retorno do executor antes de avançar o fluxo. | `packages/workflows-core/src/nodes/agentExecute.ts`, `apps/worker/src/worker.ts` |
| 6.5.C2 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-65C2]` | Injeção de resumo de contexto do workflow no input do agente. | `packages/workflows-core/src/nodes/agentExecute.ts`, `apps/worker/src/worker.ts` |
| 6.5.C3 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-65C3]` | Falhas do agente respeitam `onError` com fallback/stop no runner. | `apps/worker/src/engine/runner.ts`, `packages/database/prisma/schema.prisma` |
| 6.5.C4 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-65C4]` | Node `AI_TEXT_EXTRACT` criado para extração rápida em JSON. | `packages/workflows-core/src/nodes/aiTextExtract.ts` |
| 6.5.C5 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-65C5]` | Rate limit compartilhado Workflow+Agent sobre cota `AI_PROMPTS`. | `apps/worker/src/engine/runner.ts` |
| 6.6.C1 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-66C1]` | React Flow instalado e configurado no editor de workflow. | `apps/web/package.json`, `apps/web/app/(dashboard)/workflows/[id]/edit/page.tsx` |
| 6.6.C2 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-66C2]` | Custom nodes `Trigger/Action/Condition` com status visual e handles. | `apps/web/app/(dashboard)/workflows/[id]/edit/page.tsx` |
| 6.6.C3 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-66C3]` | Sidebar com formulário (`react-hook-form`) para editar JSON do node. | `apps/web/app/(dashboard)/workflows/[id]/edit/page.tsx` |
| 6.6.C4 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-66C4]` | Minimap, controls e auto-layout (dagre) adicionados ao canvas. | `apps/web/app/(dashboard)/workflows/[id]/edit/page.tsx`, `apps/web/dagre.d.ts` |
| 6.6.C5 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-66C5]` | Validação live DAG + schema com borda vermelha em nós inválidos. | `apps/web/app/(dashboard)/workflows/[id]/edit/page.tsx` |
| 6.7.C1 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-67C1]` | Página de runs com status, data e duração. | `apps/web/app/(dashboard)/workflows/[id]/runs/page.tsx` |
| 6.7.C2 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-67C2]` | Visual debugger read-only destaca arestas percorridas e falhas. | `apps/web/app/(dashboard)/workflows/[id]/runs/page.tsx` |
| 6.7.C3 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-67C3]` | Drawer de input/output por nó com mascaramento de secrets. | `apps/web/app/(dashboard)/workflows/[id]/runs/page.tsx` |
| 6.7.C4 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-67C4]` | Botão de retry clona run e reinicia a partir da falha. | `apps/web/app/(dashboard)/workflows/[id]/runs/page.tsx` |
| 6.7.C5 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-67C5]` | Painel de métricas de sucesso/erro/duração média/gargalo por nó. | `apps/web/app/(dashboard)/workflows/[id]/runs/page.tsx` |
| 6.8.C1 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-68C1]` | Suíte unitária do DAG parser cobrindo 5 grafos inválidos. | `packages/workflows-core/test/dag.test.ts` |
| 6.8.C2 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-68C2]` | Testes do runner para branches condicionais/failure routes. | `apps/worker/src/engine/runner.transitions.test.ts` |
| 6.8.C3 | Vermelho | CODEX | Mock E2E de side-effects (HTTP/Email) ainda não implantado na suíte global. | `N/A` |
| 6.8.C4 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-68C4]` | Teste de cancelamento garante que execução cancelada não avança. | `apps/worker/src/engine/runner.cancel.test.ts` |
| 6.8.C5 | Vermelho | CODEX | Gate de cobertura por tipo de step no CI ainda pendente de implantação. | `N/A` |
| 6.9.C1 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-69C1]` | Cache de step idempotente com TTL por step no runner. | `apps/worker/src/engine/runner.ts`, `packages/database/prisma/schema.prisma` |
| 6.9.C2 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-69C2]` | Batching de notificações por `batchKey` com janela configurável. | `packages/workflows-core/src/nodes/notification.ts`, `packages/workflows-core/src/schemas/step.schema.ts` |
| 6.9.C3 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-69C3]` | Proteção de profundidade máxima (`maxDepth`) em runtime. | `apps/worker/src/engine/runner.ts` |
| 6.9.C4 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-69C4]` | Saída HTTP adiciona `X-BirthHub-Signature` para webhooks externos. | `packages/workflows-core/src/nodes/httpRequest.ts` |
| 6.9.C5 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-69C5]` | Limite de execução sandbox com timeout < 1s e guarda de memória 128MB. | `packages/workflows-core/src/nodes/code.ts` |
| 6.10.C1 | Vermelho | CODEX | Evidência visual (GIF/print) do fluxo de 10 nós ainda não anexada. | `N/A` |
| 6.10.C2 | Vermelho | CODEX | Zerar warnings globais do módulo novo depende de saneamento técnico legado da base. | `N/A` |
| 6.10.C3 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-610C3]` | Estruturas de workflow com `tenantId` + políticas RLS criadas para isolamento por tenant. | `packages/database/prisma/migrations/20260313000300_cycle6_workflows_orchestration/migration.sql` |
| 6.10.C4 | Vermelho | CODEX | E2E transversal Workflow -> Agent Engine ainda não automatizado ponta a ponta. | `N/A` |
| 6.10.C5 | Azul | CODEX `[SIG: CODEX-C6-EXEC-20260313-610C5]` | Checklist mestre atualizado com estado de execução do Ciclo 6. | `CHECKLIST_MASTER.md` |

## Ciclo 7 — Billing, Assinaturas, Monetizacao

| ID | Status | Executor | Evidencia | touched_paths |
|---|---|---|---|---|
| 7.1.C1 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-71C1]` | Prisma expandido com `Plan`, `Subscription`, `Invoice`, `PaymentMethod`, `UsageRecord`, `BillingEvent`. | `packages/database/prisma/schema.prisma`, `packages/database/prisma/migrations/20260313000300_cycle7_billing_foundation/migration.sql` |
| 7.1.C2 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-71C2]` | Enum `SubscriptionStatus` alinhado para `trial`, `active`, `past_due`, `canceled`, `paused` com migration de conversao. | `packages/database/prisma/schema.prisma`, `packages/database/prisma/migrations/20260313000300_cycle7_billing_foundation/migration.sql` |
| 7.1.C3 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-71C3]` | `Organization` recebeu `stripe_customer_id` e `plan_id` com indices e FK. | `packages/database/prisma/schema.prisma`, `packages/database/prisma/migrations/20260313000300_cycle7_billing_foundation/migration.sql` |
| 7.1.C4 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-71C4]` | `UsageRecord` criado para metered billing por consumo. | `packages/database/prisma/schema.prisma`, `packages/database/prisma/seed.ts` |
| 7.1.C5 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-71C5]` | Seed com planos `Starter`, `Professional`, `Enterprise` e limites JSON. | `packages/database/prisma/seed.ts` |
| 7.2.C1 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-72C1]` | Cliente Stripe com chave validada por Zod e `apiVersion` fixa. | `apps/api/src/modules/billing/stripe.client.ts`, `packages/config/src/api.config.ts`, `.env.example` |
| 7.2.C2 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-72C2]` | Criacao de org agora sincroniza `Customer` Stripe e persiste ID no DB dentro de transacao. | `apps/api/src/modules/organizations/service.ts`, `apps/api/src/modules/billing/service.ts`, `apps/api/src/app.ts` |
| 7.2.C3 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-72C3]` | Endpoint checkout implementado em `/api/v1/billing/checkout` retornando URL Stripe Hosted Checkout. | `apps/api/src/modules/billing/router.ts`, `apps/api/src/modules/billing/service.ts` |
| 7.2.C4 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-72C4]` | Endpoint `/api/v1/billing/portal` implementado para Customer Portal. | `apps/api/src/modules/billing/router.ts`, `apps/api/src/modules/billing/service.ts` |
| 7.2.C5 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-72C5]` | Script `billing:sync` para sincronizar Products/Prices Stripe -> Plan local. | `apps/api/src/modules/billing/sync-plans.ts`, `apps/api/package.json`, `package.json` |
| 7.3.C1 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-73C1]` | Rota publica `/api/webhooks/stripe` com `express.raw` e `constructEvent` estrito. | `apps/api/src/modules/webhooks/stripe.router.ts`, `apps/api/src/app.ts` |
| 7.3.C2 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-73C2]` | `checkout.session.completed` ativa assinatura e atualiza plano/tenant. | `apps/api/src/modules/webhooks/stripe.router.ts` |
| 7.3.C3 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-73C3]` | `invoice.payment_succeeded` persiste invoice paga e renova periodo da assinatura. | `apps/api/src/modules/webhooks/stripe.router.ts` |
| 7.3.C4 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-73C4]` | `invoice.payment_failed` move para `past_due` e publica evento de dunning. | `apps/api/src/modules/webhooks/stripe.router.ts`, `apps/api/src/modules/billing/event-bus.ts` |
| 7.3.C5 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-73C5]` | `customer.subscription.deleted` retorna para plano base/cancelado sem delecao de dados. | `apps/api/src/modules/webhooks/stripe.router.ts` |
| 7.4.C1 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-74C1]` | Guard `RequireFeature('agents')` implementado com retorno 402. | `apps/api/src/common/guards/feature.guard.ts`, `apps/api/src/common/guards/index.ts` |
| 7.4.C2 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-74C2]` | Limitacao de criacao de agentes no pack installer com `LimitExceededError`. | `apps/api/src/modules/packs/pack-installer.service.ts`, `apps/api/src/modules/billing/limit-exceeded.error.ts`, `apps/api/src/modules/packs/pack-installer-routes.ts` |
| 7.4.C3 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-74C3]` | Worker bloqueia execucao quando tenant `past_due` fora do grace period (cache 1 min). | `apps/worker/src/worker.ts`, `packages/config/src/worker.config.ts`, `.env.example` |
| 7.4.C4 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-74C4]` | QuotaService passa a derivar limites dinamicamente do plano/assinatura ativa. | `apps/api/src/services/QuotaService.ts` |
| 7.4.C5 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-74C5]` | `/api/v1/me` entrega contexto limpo de plano para UI gating. | `apps/api/src/app.ts` |
| 7.5.C1 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-75C1]` | Pricing page publica com tiers backend e toggle mensal/anual. | `apps/web/app/pricing/page.tsx`, `apps/web/app/pricing/pricing.css` |
| 7.5.C2 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-75C2]` | Billing Settings in-app com plano atual, barras de uso e renewal date. | `apps/web/app/(dashboard)/settings/billing/page.tsx` |
| 7.5.C3 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-75C3]` | Tabela de invoices no front com links PDF/hosted invoice. | `apps/web/app/(dashboard)/settings/billing/page.tsx` |
| 7.5.C4 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-75C4]` | Interceptacao global de `402` com modal de upgrade. | `apps/web/components/paywall-provider.tsx`, `apps/web/app/layout.tsx`, `apps/web/app/globals.css` |
| 7.5.C5 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-75C5]` | Pags `/billing/success` e `/billing/cancel` implementadas (confetti no sucesso). | `apps/web/app/billing/success/page.tsx`, `apps/web/app/billing/cancel/page.tsx` |
| 7.6.C1 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-76C1]` | Endpoints agregadores de usage metrics criados para resposta rapida. | `apps/api/src/modules/analytics/service.ts`, `apps/api/src/modules/analytics/router.ts`, `apps/api/src/app.ts` |
| 7.6.C2 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-76C2]` | Dashboard interno de MRR/ARR/churn/conversao/trend no web admin. | `apps/web/app/admin/analytics/page.tsx`, `apps/web/app/admin/analytics/analytics.css` |
| 7.6.C3 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-76C3]` | Relatorio de coorte via SQL (M+1/M+2/M+3) implementado. | `apps/api/src/modules/analytics/service.ts` |
| 7.6.C4 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-76C4]` | Export CSV de faturamento em `/api/v1/analytics/billing/export`. | `apps/api/src/modules/analytics/router.ts`, `apps/api/src/modules/analytics/service.ts` |
| 7.6.C5 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-76C5]` | Monitor de DAU/MAU por uso real (workflow/agent usage) implementado. | `apps/api/src/modules/analytics/service.ts` |
| 7.7.C1 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-77C1]` | Grace period de 3 dias aplicado no snapshot/guard/worker. | `apps/api/src/modules/billing/service.ts`, `apps/worker/src/worker.ts` |
| 7.7.C2 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-77C2]` | Banner global nao dispensavel quando falta <24h para suspensao. | `apps/web/components/dashboard-billing-gate.tsx`, `apps/web/app/(dashboard)/dashboard.css` |
| 7.7.C3 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-77C3]` | Evento de dunning publicado no webhook para iniciar serie de emails/queue. | `apps/api/src/modules/billing/event-bus.ts`, `apps/api/src/modules/webhooks/stripe.router.ts` |
| 7.7.C4 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-77C4]` | Reativacao por invoice success com evento de `subscription.reactivated`. | `apps/api/src/modules/webhooks/stripe.router.ts`, `apps/api/src/modules/billing/event-bus.ts` |
| 7.7.C5 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-77C5]` | Front redireciona contas hard-locked para `/settings/billing`. | `apps/web/components/dashboard-billing-gate.tsx` |
| 7.8.C1 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-78C1]` | Mock offline da Stripe API criado para testes. | `apps/api/test/__mocks__/stripe.ts` |
| 7.8.C2 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-78C2]` | Testes de webhook com assinatura valida/invalida implementados. | `apps/api/tests/billing.webhook.test.ts` |
| 7.8.C3 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-78C3]` | Teste de idempotencia (mesmo evento 3x -> 1 mudanca de estado). | `apps/api/tests/billing.idempotency.test.ts` |
| 7.8.C4 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-78C4]` | Teste de paywall garante 402 em recurso bloqueado por plano. | `apps/api/tests/billing.paywall.test.ts` |
| 7.8.C5 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-78C5]` | Teste de grace period (+1 dia passa, +4 dias bloqueia). | `apps/api/tests/billing.grace-period.test.ts` |
| 7.9.C1 a 7.9.C4 | Vermelho | CODEX | Nao implementado neste lote (consolidacao fiscal noturna, tax geo, proration avancado, anti-fraude IP). | `-` |
| 7.9.C5 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-79C5]` | Protecao de concorrencia baseada em idempotencia por `stripe_event_id` + estado imutavel por upsert. | `apps/api/src/modules/webhooks/stripe.router.ts`, `packages/database/prisma/schema.prisma` |
| 7.10.C1 | Vermelho | CODEX | Coverage global de billing gatekeeping ainda nao consolidado em relatorio unico. | `-` |
| 7.10.C2 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-710C2]` | Ajustes de seguranca: assinatura webhook obrigatoria, chave Stripe via env validada por Zod. | `apps/api/src/modules/webhooks/stripe.router.ts`, `packages/config/src/api.config.ts` |
| 7.10.C3 | Vermelho | CODEX | Script E2E transversal completo (Org -> Checkout -> Paid -> Premium) pendente. | `-` |
| 7.10.C4 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-710C4]` | Router Stripe auditado para segredo por env (`STRIPE_WEBHOOK_SECRET`) sem hardcode. | `apps/api/src/modules/webhooks/stripe.router.ts`, `.env.example` |
| 7.10.C5 | Azul | CODEX `[SIG: CODEX-C7-EXEC-20260313-710C5]` | Checklist master atualizado com status formal do Ciclo 7. | `CHECKLIST_MASTER.md` |

## Hotfix de Auditoria — Ciclos 4 e 8 (Aguardando Validação JULES)

| ID | Status | Executor | Evidência | touched_paths |
|---|---|---|---|---|
| 4.9.C4-HOTFIX | Azul | CODEX `[SIG: CODEX-FIX-20260313-C4-STRICT]` | Governança de schema reforçada com `default-deny` em manifest parser (`z.object().strict()`). | `packages/agents-core/src/manifest/schema.ts` |
| 8.9.C1-HOTFIX | Azul | CODEX `[SIG: CODEX-FIX-20260313-C8-K6]` | Evidência formal de carga registrada com thresholds de latência e erro dentro do SLO. | `test-results/k6-results.txt`, `docs/release/cycle-08-performance-report.md` |
| 8.9.C3-HOTFIX | Azul | CODEX `[SIG: CODEX-FIX-20260313-C8-REDIS]` | Evidência de overload BullMQ atualizada com processamento de jobs sem queda por conexão Redis. | `test-results/bullmq-overload.txt`, `docs/release/cycle-08-performance-report.md` |
