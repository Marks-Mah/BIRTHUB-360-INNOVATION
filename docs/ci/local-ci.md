# CI local reproduzivel

O baseline local agora converge para o mesmo fluxo canonico usado pelos gates de CI. As referencias principais sao `pnpm ci:task core`, `pnpm ci:task satellites` e `pnpm ci:full`. A suite Python legada de `agents/*` passou a rodar em lane separado via `pnpm ci:legacy-agents`.

## Bootstrap

Windows sem runtime no PATH:

```powershell
pnpm bootstrap:local:windows
```

Esse bootstrap instala Node 22.x portatil e audita a presenca de Python 3.12+ e Docker. Os gates `pnpm ci:task satellites`, `pnpm ci:task workflow-suite` e `pnpm ci:full` tambem exigem Python 3.12+. `pnpm ci:full` exige ainda browsers do Playwright instalados.

## Comandos canonicos

```bash
pnpm ci:task core
pnpm ci:task satellites
pnpm ci:full
pnpm ci:legacy-agents
pnpm ci:task pack-tests
pnpm ci:task workflow-suite
pnpm clean
```

Wrappers locais:

```bash
pnpm ci:local
pwsh ./ci-local.ps1
```

## O que `ci:full` executa

Ordem canonica:

1. `pnpm preflight:full`
2. `pnpm install --frozen-lockfile`
3. `pnpm db:generate`
4. `pnpm ci:task core`
5. `pnpm ci:task satellites`
6. `pnpm packs:validate`
7. `pnpm packs:test`
8. `pnpm packs:smoke`
9. `pnpm packs:regression`
10. `pnpm test:workflows`
11. `pnpm test:billing:coverage`
12. `pnpm security:guards`
13. `pnpm security:report`
14. `pnpm test:e2e`

Cada etapa roda com defaults compativeis com CI e encerra com dirty-tree check.

## Lanes canonicos

- `pnpm ci:task core`: preflight Node/pnpm + lint/typecheck/test/test:isolation/build do trio `apps/web`, `apps/api`, `apps/worker`.
- `pnpm ci:task satellites`: preflight Python + gates suportados dos satelites.
- `pnpm ci:task workflow-suite`: preflight Python + suite de workflow/billing/seguranca suportada pelo release gate.
- `pnpm ci:legacy-agents`: preflight Python + `pnpm test:agents` para o legado Python em `agents/*` e `tests/integration`.

## Matriz dos satelites

- `apps/api-gateway`: gate suportado em `lint` e `test`; `POST /leads` ficou coberto por DTO Zod e erro 400 estruturado.
- `apps/voice-engine`: gate suportado em `lint`, `typecheck`, `test` e `build`.
- `apps/agent-orchestrator`: gate suportado em contrato TS (`test`) e smokes Python (`pytest`) para `/health`, `/events/run` e `/events/metrics`.
- `apps/webhook-receiver`: gate suportado em smokes Python (`pytest`) para `/health` e `/webhooks/{provider}`; `src/server.ts` permanece apenas como stub legado.
- `apps/dashboard`: superficie secundaria/legada; nesta fase participa apenas do smoke lane.
- `agents/*`: superficie Python legada fora do gate canonico de release; permanece executavel sob demanda em `pnpm ci:legacy-agents`.

## Divida legada fora do gate bloqueante

- `apps/dashboard`: `lint`, `typecheck` e `build` seguem com divida estrutural anterior a este hardening.
- `apps/api-gateway`: `typecheck` e `build` seguem dependentes de saneamento legado fora do escopo desta fase.
- `apps/agent-orchestrator`: `lint`, `typecheck` e `build` seguem dependentes de saneamento legado fora do escopo desta fase.
- O status consolidado desses bloqueios fica registrado em `docs/release/platform-hardening-readiness-2026-03-15.md`.

## Variaveis padrao

- `DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/birthub_cycle1`
- `REDIS_URL=redis://localhost:6379`
- `NODE_ENV=test`
- `NEXT_PUBLIC_ENVIRONMENT=ci-local`
- `SESSION_SECRET=ci-local-secret`
- `WEB_BASE_URL=http://localhost:3001`

## Checklist pre-PR

- Rodar `pnpm ci:task core` e `pnpm ci:task satellites` antes de `pnpm ci:full`, ou documentar explicitamente os gates bloqueados.
- Confirmar que a arvore nao fica suja por artefatos proibidos apos build/test.
- Atualizar evidencias operacionais quando a mudanca afetar CI, lint, billing, isolamento ou workers.
- Se houver bloqueio real, registrar comando, output, causa provavel e proximo passo.
