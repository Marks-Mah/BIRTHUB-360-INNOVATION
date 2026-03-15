# Ciclo 1 - Pipeline Local

## 1) Diagnostico

- Problema encontrado: o pipeline local precisava sair de uma sequencia ad hoc para um baseline reproduzivel em um unico comando.
- Causa raiz: o wrapper PowerShell estava apontando para outro workspace e o fluxo shell ainda nao refletia todos os gates do prompt v2.
- Impacto: o time nao tinha uma historia unica para `install -> lint -> typecheck -> test -> build`.

## 2) Plano

- Criar um comando canonico (`pnpm ci:full`) com ordem fixa.
- Reexecutar o baseline tecnico viavel no ambiente atual.
- Documentar separadamente os gates bloqueados por runtime externo.

## 3) Execucao

- Bootstrapado Node 22.x portatil com pnpm 9.1.0.
- `pnpm install --frozen-lockfile` validado com sucesso.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:isolation` e `pnpm build` foram estabilizados apos os ajustes em `apps/web` e `apps/worker`.
- `pnpm ci:full` foi implementado para encadear todos os gates do prompt, incluindo dirty-tree check.

## 4) Validacao

- `pnpm install --frozen-lockfile`: OK
- `pnpm lint`: OK
- `pnpm typecheck`: OK
- `pnpm test`: OK
- `pnpm test:isolation`: OK
- `pnpm build`: OK
- `pnpm test:e2e`: BLOCKED localmente ate instalar browsers do Playwright
- `pnpm test:agents`: BLOCKED localmente ate instalar Python 3.12+ e dependencias dos agentes

## 5) Evidencia

- Comando canonico: `package.json`, `scripts/ci/full.mjs`
- Wrappers locais: `ci-local.ps1`, `scripts/ci/local-ci.sh`
