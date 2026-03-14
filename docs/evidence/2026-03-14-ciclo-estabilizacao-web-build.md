# Ciclo de Estabilização — 2026-03-14 (Web Build / Monorepo)

## Resumo do problema
O build do workspace falhava no app `@birthub/web`, bloqueando o `pnpm build` do monorepo.

## Causa raiz
1. Dependência de fonte remota (`next/font/google`) exigia acesso ao Google Fonts durante `next build`.
2. Arquivo de export circular (`components/agents/agent-detail-tabs.ts`) reexportava a si próprio.
3. Uso de extensão `.tsx` explícita em import de rota (`page.tsx`) sem `allowImportingTsExtensions`.
4. `useSearchParams()` dentro do provider global sem boundary de `Suspense`, quebrando prerender em `/developers/apikeys`.

## Arquivos alterados
- `apps/web/app/layout.tsx`
- `apps/web/app/globals.css`
- `apps/web/app/(dashboard)/agents/[id]/page.tsx`
- `apps/web/providers/AppProviders.tsx`
- Removido: `apps/web/components/agents/agent-detail-tabs.ts`

## Comandos executados e resultado
- `pnpm install` ✅
- `pnpm build` (diagnóstico inicial) ⚠️ (longo; gargalo identificado no web build)
- `pnpm --filter @birthub/web build` ❌ (falha inicial: Google Fonts)
- `pnpm --filter @birthub/web build` ❌ (falha seguinte: export circular / import .tsx)
- `pnpm --filter @birthub/web build` ❌ (falha seguinte: `useSearchParams` sem Suspense)
- `pnpm --filter @birthub/web build` ✅
- `pnpm build` ✅
- `pnpm --filter @birthub/web test` ✅
- `pnpm test` ✅ (executado antes das correções; baseline verde)

## Resultado de build
- Monorepo principal voltou a completar `pnpm build` com sucesso.
- O app web finalizou build com geração estática completa.

## Resultado de testes
- Testes do app web: 1/1 passando.
- Suite principal (`pnpm test`) já estava verde no baseline do ciclo.

## Pendências restantes
- Aviso de depreciação Next.js sobre `middleware` -> `proxy` continua pendente.
- Warnings de outputs de `turbo` para tarefas `test` continuam pendentes.
- Evidência de screenshot não gerada por falha de runtime do navegador no ambiente (SIGSEGV no Chromium headless).

## Próximos passos recomendados
1. Migrar `middleware` para convenção `proxy` no app web.
2. Ajustar `turbo.json` para `outputs` realistas nas tasks de teste.
3. Rodar suíte Python (`pytest agents tests/integration`) após ciclo TS consolidado.
