# Validação do Jules — modo cruzado cru (go/no-go próximos ciclos)

Data: 2026-03-12

## Escopo cru
- verificar tudo que foi entregue pelo Jules via merges `jules-*` no Git;
- cruzar entregas com `CHECKLIST E PROMPTS` dos ciclos 02, 04, 07, 09 e 10;
- executar checks técnicos para decisão de liberação.

## Evidência 1 — Merges/commits do Jules
- `080dece` → `68d4034` (ciclo 02)
- `a37ee5b` → `2382c28` (ciclo 04)
- `c0eaa1b` → `1294481`, `d6b148b` (ciclo 07)
- `0ae9d94` → `cffd1b6` (ciclo 09)
- `8f37089` → `703f5e4` (ciclo 10)

## Evidência 2 — Inventário completo do que Jules fez
Resultado bruto do inventário por commit:
- arquivos únicos: **31**
- existentes no `HEAD`: **31/31**
- markdowns: **30**

### Lista completa (31/31)
| ciclo | commit | arquivo | status |
|---|---|---|---|
| 07 | d6b148b | agents/shared/errors.py | OK |
| 04 | 2382c28 | docs/adr/ADR-013-agent-manifest.md | OK |
| 07 | d6b148b | docs/adr/ADR-024-modelagem-planos.md | OK |
| 02 | 68d4034 | docs/adrs/ADR-007-multi-tenancy-strategy.md | OK |
| 04 | 2382c28 | docs/analysis/malicious-manifest-risk.md | OK |
| 07 | 1294481 | docs/billing/analise-localizacao.md | OK |
| 07 | 1294481 | docs/billing/checklist-pci-dss.md | OK |
| 07 | d6b148b | docs/billing/comunicacao-mudanca-preco.md | OK |
| 07 | d6b148b | docs/billing/politica-grandfathering.md | OK |
| 07 | 1294481 | docs/billing/politica-reembolso.md | OK |
| 07 | 1294481 | docs/billing/risco-double-charge.md | OK |
| 07 | d6b148b | docs/billing/risco-downgrade.md | OK |
| 07 | d6b148b | docs/billing/tabela-planos.md | OK |
| 07 | 1294481 | docs/billing/ux-checkout.md | OK |
| 04 | 2382c28 | docs/guides/agent-manifest-contribution.md | OK |
| 04 | 2382c28 | docs/guides/capabilities-definition.md | OK |
| 10 | 703f5e4 | docs/marketplace/curation_policy.md | OK |
| 10 | 703f5e4 | docs/marketplace/reputation_analysis.md | OK |
| 10 | 703f5e4 | docs/marketplace/review_moderation_process.md | OK |
| 10 | 703f5e4 | docs/marketplace/risk_analysis_malicious_pack.md | OK |
| 10 | 703f5e4 | docs/marketplace/verification_criteria.md | OK |
| 04 | 2382c28 | docs/policies/manifest-review.md | OK |
| 02 | 68d4034 | docs/policies/tenant-deletion-policy.md | OK |
| 02 | 68d4034 | docs/security/cross-tenant-inference-risks.md | OK |
| 02 | 68d4034 | docs/security/cross-tenant-risk-mapping.md | OK |
| 02 | 68d4034 | docs/security/tenant-isolation-checklist.md | OK |
| 09 | cffd1b6 | docs/ux/aha_moment.md | OK |
| 09 | cffd1b6 | docs/ux/onboarding_friction.md | OK |
| 09 | cffd1b6 | docs/ux/onboarding_journey.md | OK |
| 09 | cffd1b6 | docs/ux/onboarding_success.md | OK |
| 09 | cffd1b6 | docs/ux/onboarding_survey.md | OK |

## Evidência 3 — Cruzamento com checklist/prompt
Referências usadas:
- `CHECKLIST E PROMPTS/INDEX_BirthHub360_v4.html`
- `CHECKLIST E PROMPTS/BirthHub360_Ciclo_02_JULES.html`
- `CHECKLIST E PROMPTS/BirthHub360_Ciclo_04_JULES.html`
- `CHECKLIST E PROMPTS/BirthHub360_Ciclo_07_JULES.html`
- `CHECKLIST E PROMPTS/BirthHub360_Ciclo_09_JULES.html`
- `CHECKLIST E PROMPTS/BirthHub360_Ciclo_10_JULES.html`
- `CHECKLIST E PROMPTS/BirthHub360_Prompt_Ciclo_10_JULES.html`

Match objetivo por ciclo:
- ciclo 02: multi-tenancy / isolamento / tenant → coberto.
- ciclo 04: manifest / review → coberto.
- ciclo 07: billing / reembolso / grandfathering / checkout / pci → coberto.
- ciclo 09: onboarding / fricção / aha → coberto.
- ciclo 10: marketplace / curadoria / malicioso / moderação / verificação → coberto.

## Evidência 4 — Checks técnicos (estado atual)
Comandos executados:
1. `pnpm lint`
2. `pnpm --filter @birthub/dashboard test`
3. `pnpm test:agents`
4. `pnpm build`

Resultado bruto:
- `pnpm lint` → **PASS**.
- `pnpm --filter @birthub/dashboard test` → **FAIL**
  - `isRtlLanguage` não exportado em `../lib/platform-i18n.ts`.
  - `../lib/sanitize` não encontrado.
- `pnpm test:agents` → **FAIL**
  - 16 erros de coleta/import em múltiplos agentes.
- `pnpm build` → **FAIL**
  - `TS5097` em `@birthub/auth`.
  - `TS5097` em `@birthub/security`.
  - `TS5097` em `@birthub/agent-runtime`.
  - `TS5097` em `@birthub/conversation-core`.

## Decisão de liberação para próximos ciclos
**Status atual: NÃO LIBERADO**.

Critério go-live para liberar:
- [ ] `pnpm lint` PASS
- [ ] `pnpm --filter @birthub/dashboard test` PASS
- [ ] `pnpm test:agents` PASS
- [ ] `pnpm build` PASS

Conclusão crua:
- documentação do Jules: presente e rastreável (31/31 arquivos);
- bloqueio de liberação: técnico (testes/build).
