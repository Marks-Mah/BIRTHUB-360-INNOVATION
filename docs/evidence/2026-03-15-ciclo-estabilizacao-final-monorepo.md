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

5. **Correção de lint impeditiva em workflows-core**
   - Remoção de `try/catch` redundante em `packages/workflows-core/src/nodes/httpRequest.ts`.

## Validação local executada

- `pnpm install --frozen-lockfile` ✅
- `pnpm --filter @birthub/agents-core build` ✅
- `pnpm --filter @birthub/agents-core test` ✅
- `pnpm typecheck` ✅ (após ajuste de paths do web)
- `pnpm --filter @birthub/web typecheck` ✅
- `pnpm --filter @birthub/workflows-core lint` ✅
- `pnpm lint` ❌ (falhas remanescentes em `packages/database`, não mascaradas)
- `pnpm --filter @birthub/web build` ⚠️ iniciou build e eliminou warning de `middleware`, porém execução não concluiu neste ambiente dentro da janela operacional.

## Bloqueadores remanescentes

1. Billing do GitHub Actions (externo).
2. Pendências de lint reais no `packages/database`.
3. Build full do web ainda requer fechamento observável fim-a-fim neste ambiente.

## Conclusão

Mesmo sem CI remoto, o repositório ficou mais próximo de um pipeline reproduzível e com sinais mais claros de saúde local, sem mascarar erros reais.
