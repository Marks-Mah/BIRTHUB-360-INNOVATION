# Evidência — Ciclo Estabilização Final do Monorepo (2026-03-15)

## Contexto

- O CI remoto do GitHub pode permanecer indisponível devido a billing.
- Foram aplicados ajustes locais para deixar validação, cache e governança mais previsíveis.

## Mudanças executadas

1. **Governança CI local**
   - Novo script `scripts/ci/local-ci.sh`.
   - Novo comando raiz `pnpm ci:local`.
   - Documentação em `docs/ci/local-ci.md`.

2. **Turbo outputs**
   - `test` e `test:isolation` com `outputs: []` para evitar ruído de "missing outputs" em pacotes que não geram artefatos.
   - `build` manteve foco em artefatos de compilação (`dist/.next`) e cobertura.

3. **Migração Next.js middleware → proxy**
   - `apps/web/middleware.ts` migrado para `apps/web/proxy.ts`.
   - `apps/dashboard/middleware.ts` migrado para `apps/dashboard/proxy.ts`.
   - Compatível com convenção recomendada do Next.js atual.

4. **Estabilização estrutural do web typecheck**
   - Ajuste em `apps/web/tsconfig.json` para resolver pacotes internos via `src/` (não `dist/`) durante typecheck.
   - Remove dependência implícita de build prévio para tipagem.

5. **Correções de lint impeditivas em workflows-core e database**
   - Remoção de `try/catch` redundante em `packages/workflows-core/src/nodes/httpRequest.ts`.
   - Em `packages/database`:
     - Remoção de type assertions desnecessárias em `prisma/seed.ts`.
     - Ajuste de assinatura opcional e `void` explícito em `Promise.finally` em `src/client.ts`.
     - Marcação explícita (`void`) de chamadas de `test(...)` em arquivos de teste para resolver `no-floating-promises`.

## Causa raiz das falhas restantes de lint (database)

As 9 falhas em `packages/database` eram todas violações reais de regras `@typescript-eslint`:

1. `no-unnecessary-type-assertion` em `prisma/seed.ts`: casts redundantes em `selectedPlan.limits`.
2. `no-duplicate-type-constituents` em `src/client.ts`: `model?: string | undefined` duplicava opcionalidade.
3. `no-floating-promises` em `src/client.ts` e testes: promessas intencionais sem `await`/`void` explícito.

As correções mantêm tipagem/contrato e não usam disables.

## Validação local executada (rodada atual)

- `pnpm --filter @birthub/database lint` ✅
- `pnpm lint` ⚠️ executado, mas sem conclusão observável dentro da janela operacional (custos altos de lint/build no ambiente atual; sem novas falhas explícitas emitidas durante a execução).
- `pnpm ci:local` ⚠️ executado até etapa de `build`; bloqueado por tempo de execução prolongado no `@birthub/web build`.
- `pnpm --filter @birthub/web build` ⚠️ iniciado e ficou em `Creating an optimized production build ...` sem conclusão na janela operacional.

## Status de readiness (parcial)

- **Lint do pacote crítico (`packages/database`)**: saneado.
- **Governança local de CI**: pronta e documentada.
- **Typecheck**: estabilizado em rodada anterior (incluindo `@birthub/web`).
- **Build web**: ainda precisa fechamento observável fim-a-fim neste ambiente.

## Bloqueadores remanescentes

1. Billing do GitHub Actions (externo).
2. Conclusão observável de `pnpm lint` global e `@birthub/web build` neste ambiente (tempo/capacidade).
3. Execução completa `pnpm ci:local` até o fim, dependente do item 2.

## Conclusão

O gargalo técnico de lint em `packages/database` foi eliminado sem enfraquecer segurança/tipos. O próximo passo é obter execução completa de build/lint globais em uma janela com recursos/tempo suficientes para consolidar readiness final.
