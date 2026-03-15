# Ciclo 4 - CI Readiness

## 1) Diagnostico

- Problema encontrado: o monorepo tinha gates dispersos entre scripts locais e workflow remoto, sem um comando canonico unico.
- Causa raiz: `ci-local.ps1` estava hardcoded para outro workspace, `scripts/ci/local-ci.sh` mantinha sequencia propria e o workflow ainda chamava scripts individuais.
- Impacto: diferenca entre validacao local e remota, risco de "works on my machine" e baixa confiabilidade do baseline.

## 2) Plano

- Criar `pnpm ci:full` e `pnpm ci:task` como fonte unica dos gates.
- Transformar os wrappers locais em cascas finas do fluxo canonico.
- Endurecer `.github/workflows/ci.yml` para convergir em `ci:task` e dirty-tree check.

## 3) Execucao

- Adicionados `scripts/ci/full.mjs`, `scripts/ci/check-dirty-tree.mjs`, `scripts/clean.mjs` e `scripts/agent/generate-snapshot.mjs`.
- `ci-local.ps1` foi refeito para usar o workspace atual, bootstrapar Node portatil quando necessario e executar `scripts/ci/full.mjs`.
- `scripts/ci/local-ci.sh` foi reduzido a wrapper do fluxo canonico.
- O workflow principal passou a usar `pnpm ci:task <grupo>` em vez de reproduzir manualmente cada sequencia.
- `workflow-suite` foi preparado para incluir `pnpm test:agents` com setup explicito de Python.

## 4) Validacao

- Inspecao do workflow principal: OK
- Convergencia local -> CI via `ci:task`: OK
- Dirty-tree gate disponivel apos cada etapa canonica: OK
- Bootstrap Node 22.x + pnpm 9.1.0 para Windows: OK
- Python 3.12+ e Docker ainda dependem do ambiente da maquina: BLOCKED localmente

## 5) Evidencia

- Workflow principal: `.github/workflows/ci.yml`
- Wrapper PowerShell: `ci-local.ps1`
- Wrapper shell: `scripts/ci/local-ci.sh`
- Gate de arvore suja: `scripts/ci/check-dirty-tree.mjs`
