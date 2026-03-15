# CI local reproduzivel

O baseline local agora converge para o mesmo fluxo canonico usado pelos gates de CI. A referencia principal e `pnpm ci:full`.

## Bootstrap

Windows sem runtime no PATH:

```powershell
pnpm bootstrap:local:windows
```

Esse bootstrap instala Node 22.x portatil e audita a presenca de Python 3.12+ e Docker. As suites `pnpm test:agents` e qualquer fluxo com compose continuam dependentes desses runtimes.

## Comandos canonicos

```bash
pnpm ci:full
pnpm ci:task platform
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

1. `pnpm install --frozen-lockfile`
2. `pnpm db:generate`
3. `pnpm lint`
4. `pnpm typecheck`
5. `pnpm test`
6. `pnpm test:isolation`
7. `pnpm build`
8. `pnpm packs:validate`
9. `pnpm packs:test`
10. `pnpm packs:smoke`
11. `pnpm packs:regression`
12. `pnpm test:workflows`
13. `pnpm security:guards`
14. `pnpm security:report`
15. `pnpm test:e2e`
16. `pnpm test:agents`

Cada etapa roda com defaults compativeis com CI e encerra com dirty-tree check.

## Variaveis padrao

- `DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/birthub_cycle1`
- `REDIS_URL=redis://localhost:6379`
- `NODE_ENV=test`
- `NEXT_PUBLIC_ENVIRONMENT=ci-local`
- `SESSION_SECRET=ci-local-secret`
- `WEB_BASE_URL=http://localhost:3001`

## Checklist pre-PR

- Rodar `pnpm ci:full` ou documentar explicitamente os gates bloqueados.
- Confirmar que a arvore nao fica suja por artefatos proibidos apos build/test.
- Atualizar evidencias operacionais quando a mudanca afetar CI, lint, billing, isolamento ou workers.
- Se houver bloqueio real, registrar comando, output, causa provavel e proximo passo.
