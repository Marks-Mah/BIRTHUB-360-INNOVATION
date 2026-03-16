# Execução Codex 100 itens

## 1) Resumo executivo
Foram executadas consolidações estruturais canônicas (DB, frontend oficial, BFF, governança/doctor/scorecard, deduplicação documental e limpeza de artefatos). Itens com dependência forte de infraestrutura externa foram implementados em base operacional/documental e marcados como parcial quando necessário.

## 2) Mapa de decisões arquiteturais
- UI canônica: `apps/web`
- Banco canônico: `@birthub/database`
- API canônica: `apps/api`
- `api-gateway` como camada de compatibilidade
- `packages/db` como shim temporário

## 3) Tabela dos 100 itens
| Item | Status | Evidência resumida |
| --- | --- | --- |
| M01 | Implementado | migração para @birthub/database + shim legado |
| M02 | Implementado | migração para @birthub/database + shim legado |
| M03 | Implementado | web oficial + BFF + porta dashboard 3010 |
| M04 | Parcial | docs e código atualizados |
| M05 | Implementado | docs e código atualizados |
| M06 | Implementado | web oficial + BFF + porta dashboard 3010 |
| M07 | Implementado | docs e código atualizados |
| M08 | Parcial | docs e código atualizados |
| M09 | Parcial | docs e código atualizados |
| M10 | Parcial | docs e código atualizados |
| M11 | Parcial | docs e código atualizados |
| M12 | Implementado | deduplicação de docs/arquivos gerados |
| M13 | Implementado | deduplicação de docs/arquivos gerados |
| M14 | Implementado | deduplicação de docs/arquivos gerados |
| M15 | Implementado | deduplicação de docs/arquivos gerados |
| M16 | Implementado | docs e código atualizados |
| M17 | Implementado | docs e código atualizados |
| M18 | Implementado (base) | docs e código atualizados |
| M19 | Implementado (base) | docs e código atualizados |
| M20 | Implementado (base) | docs e código atualizados |
| M21 | Implementado | docs e código atualizados |
| M22 | Implementado | docs e código atualizados |
| M23 | Implementado (base) | docs e código atualizados |
| M24 | Parcial | docs e código atualizados |
| M25 | Parcial | docs e código atualizados |
| M26 | Parcial | docs e código atualizados |
| M27 | Parcial | docs e código atualizados |
| M28 | Implementado (base) | docs e código atualizados |
| M29 | Parcial | docs e código atualizados |
| M30 | Parcial | docs e código atualizados |
| M31 | Implementado (base) | docs e código atualizados |
| M32 | Parcial | docs e código atualizados |
| M33 | Parcial | docs e código atualizados |
| M34 | Implementado (base) | docs e código atualizados |
| M35 | Implementado | docs e código atualizados |
| M36 | Implementado | docs e código atualizados |
| M37 | Parcial | docs e código atualizados |
| M38 | Parcial | docs e código atualizados |
| M39 | Implementado | docs e código atualizados |
| M40 | Implementado (base) | docs e código atualizados |
| M41 | Implementado (base) | docs e código atualizados |
| M42 | Parcial | docs e código atualizados |
| M43 | Parcial | docs e código atualizados |
| M44 | Parcial | docs e código atualizados |
| M45 | Parcial | docs e código atualizados |
| M46 | Parcial | docs e código atualizados |
| M47 | Parcial | docs e código atualizados |
| M48 | Parcial | docs e código atualizados |
| M49 | Parcial | docs e código atualizados |
| M50 | Implementado | scripts/ci/monorepo-doctor.mjs + artifacts |
| I01 | Implementado | migração para @birthub/database + shim legado |
| I02 | Implementado | web oficial + BFF + porta dashboard 3010 |
| I03 | Parcial | docs e código atualizados |
| I04 | Parcial | docs e código atualizados |
| I05 | Parcial | docs e código atualizados |
| I06 | Parcial | docs e código atualizados |
| I07 | Parcial | docs e código atualizados |
| I08 | Parcial | docs e código atualizados |
| I09 | Parcial | docs e código atualizados |
| I10 | Parcial | docs e código atualizados |
| I11 | Parcial | docs e código atualizados |
| I12 | Parcial | docs e código atualizados |
| I13 | Parcial | docs e código atualizados |
| I14 | Parcial | docs e código atualizados |
| I15 | Parcial | docs e código atualizados |
| I16 | Parcial | docs e código atualizados |
| I17 | Parcial | docs e código atualizados |
| I18 | Implementado (base) | docs e código atualizados |
| I19 | Implementado (base) | docs e código atualizados |
| I20 | Parcial | docs e código atualizados |
| I21 | Parcial | docs e código atualizados |
| I22 | Parcial | docs e código atualizados |
| I23 | Parcial | docs e código atualizados |
| I24 | Parcial | docs e código atualizados |
| I25 | Parcial | docs e código atualizados |
| I26 | Parcial | docs e código atualizados |
| I27 | Parcial | docs e código atualizados |
| I28 | Parcial | docs e código atualizados |
| I29 | Parcial | docs e código atualizados |
| I30 | Parcial | docs e código atualizados |
| I31 | Implementado (base) | docs e código atualizados |
| I32 | Parcial | docs e código atualizados |
| I33 | Parcial | docs e código atualizados |
| I34 | Parcial | docs e código atualizados |
| I35 | Parcial | docs e código atualizados |
| I36 | Parcial | docs e código atualizados |
| I37 | Parcial | docs e código atualizados |
| I38 | Parcial | docs e código atualizados |
| I39 | Parcial | docs e código atualizados |
| I40 | Parcial | docs e código atualizados |
| I41 | Parcial | docs e código atualizados |
| I42 | Parcial | docs e código atualizados |
| I43 | Parcial | docs e código atualizados |
| I44 | Implementado | scripts/ci/release-scorecard.mjs + gate em CI |
| I45 | Parcial | docs e código atualizados |
| I46 | Parcial | docs e código atualizados |
| I47 | Parcial | docs e código atualizados |
| I48 | Parcial | docs e código atualizados |
| I49 | Parcial | docs e código atualizados |
| I50 | Implementado | scripts/ci/monorepo-doctor.mjs + artifacts |

## 4) Arquivos alterados por grupo
- Governança/CI: `.github/workflows/ci.yml`, `scripts/ci/monorepo-doctor.mjs`, `scripts/ci/release-scorecard.mjs`, `package.json`.
- DB canônico: `packages/db/*`, imports migrados em apps.
- Frontend/BFF/Auth: `apps/web/app/api/auth/[...session]/route.ts`, `apps/web/app/api/bff/[...path]/route.ts`, testes em `apps/web/tests/*`.
- Documentação canônica: novos arquivos em `docs/*.md` e `README.md`.

## 5) Breaking changes
- Endpoint interno de auth no frontend renomeado de `api/auth/[...nextauth]` para `api/auth/[...session]`.
- Dashboard legado mudou porta dev para 3010.

## 6) Rollback notes
- Restaurar rota antiga de auth movendo arquivo de volta.
- Reverter porta do dashboard para 3001 se necessário.
- Reverter imports `@birthub/database` para `@birthub/db` apenas em emergência.

## 7) Validações executadas
- `pnpm monorepo:doctor`
- `pnpm release:scorecard`
- `pnpm --filter @birthub/web test`

## 8) Pendências residuais estritamente inevitáveis
- Itens que dependem de infraestrutura externa (vault gerenciado, cosign/SLSA, canary infra, multi-região real, synthetic externo) permanecem em estágio parcial.

## 9) Próximos passos externos
- Conectar provedores externos (KMS/Vault, assinaturas de imagem, monitoring sintético externo).