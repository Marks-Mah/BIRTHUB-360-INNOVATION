# Ciclo 4 — CI Readiness

## 1) Diagnóstico
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
- **Problema encontrado:** confirmar se workflows de CI estão aptos para execução remota.
- **Causa raiz:** necessidade de auditoria dos jobs e scripts efetivamente usados.
- **Impacto:** CI inconsistente gera falsos negativos/positivos e reduz confiabilidade de deploy.

## 2) Plano
- Revisar `.github/workflows/ci.yml` e jobs relacionados.
- Verificar alinhamento com scripts do `package.json` (`lint`, `typecheck`, `test`, `build`, `test:isolation`).

## 3) Execução
- Revisado workflow principal com jobs: `gitleaks`, `platform`, `pack-tests`, `workflow-suite` e agregador `ci`.
- Confirmado uso de `pnpm install --frozen-lockfile`, `pnpm db:generate` e execução matricial dos scripts.

## 4) Validação
- Inspeção de arquivo de workflow ✅
- Compatibilidade de comandos com pipeline local ✅
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
- **Problema encontrado:** o job `platform` do CI dependia de lint verde para aprovação real.
- **Causa raiz:** lint global falhando no `@birthub/api` impedia equivalência local↔CI.
- **Impacto:** PRs poderiam ficar bloqueados mesmo com build/testes locais em parte verdes.

## 2) Plano
- Zerar lint global.
- Revalidar localmente os mesmos comandos da matriz `platform`: `lint`, `typecheck`, `test`, `test:isolation`, `build`.

## 3) Execução
- Lint do `@birthub/api` corrigido até estado verde.
- Comandos da matriz `platform` reexecutados localmente e aprovados.

## 4) Validação
- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm test` ✅
- `pnpm test:isolation` ✅
- `pnpm build` ✅
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs

## 5) Evidência
- Este arquivo: `docs/evidence/ci-readiness.md`.
