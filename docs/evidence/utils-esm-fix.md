# Evidência: auditoria/autofix de exports internos (ESM/NodeNext)

## Comandos executados

```bash
node scripts/fix-internal-package-exports.mjs
pnpm -r build
pnpm test
```

## Pacotes alterados

O script alterou 21 pacotes internos:

- packages/agent-runtime
- packages/agents-core
- packages/auth
- packages/billing
- packages/conversation-core
- packages/db
- packages/integrations
- packages/llm-client
- packages/logger
- packages/queue
- packages/security
- packages/shared-types
- packages/utils
- agents/ae
- agents/analista
- agents/financeiro
- agents/juridico
- agents/ldr
- agents/marketing
- agents/pos_venda
- agents/sdr

## Diffs principais aplicados

O autofix aplicou mudanças estruturais repetidas por pacote:

1. `src/index.ts` (barrel): inclusão de `export * from "./<arquivo>.js";` para arquivos `.ts/.tsx` do `src`.
2. `package.json`: padronização para:
   - `"type": "module"`
   - `"main": "./dist/index.js"`
   - `"types": "./dist/index.d.ts"`
   - `"exports"` com entrypoint público único em `.`
3. `tsconfig.json` (quando existente): padronização de `compilerOptions` com:
   - `target: "ES2022"`
   - `module: "NodeNext"`
   - `moduleResolution: "NodeNext"`
   - `declaration: true`
   - `outDir: "dist"`
   - `rootDir: "src"`
   - `verbatimModuleSyntax: true`
   - `isolatedModules: true`
   - `include: ["src/**/*"]` quando ausente

## Resultado do build

- Execução do script: build por pacote alterado retornou falha em todos os 21 pacotes.
- Execução global `pnpm -r build`: falhou cedo em `@birthub/agent-runtime` com erro de `rootDir`/imports de teste (`runtime.test.ts` importando `../../index.ts`) e restrição de extensão `.ts` em import sob configuração atual.

## Resultado dos testes

- Execução `pnpm test`: falhou.
- Falha principal reportada pelo Turbo: `@birthub/dashboard#test`.
- Erro observado em `@birthub/web:test`: `ERR_MODULE_NOT_FOUND` para `apps/dashboard/lib/sanitize` importado em `apps/dashboard/__tests__/sanitize.test.ts`.

## Pendências manuais

1. Revisar pacotes com `tsconfig` específico de testes para evitar conflito entre `rootDir: "src"` e arquivos de teste/imports fora de `src`.
2. Ajustar imports de testes ESM (extensões e paths) para compatibilidade NodeNext.
3. Confirmar se todos os pacotes devem mesmo expor apenas `.` em `exports` (alguns podem exigir subpath exports explícitos).
4. Revisar geração de barrel para evitar re-export indesejado de arquivos que não fazem parte da API pública.
5. Corrigir suite do dashboard/web antes de validar baseline pós-migração.

## Artefatos

- Relatório JSON detalhado: `docs/evidence/package-exports-fix-report.json`
- Script de autofix: `scripts/fix-internal-package-exports.mjs`
