# ADR-031: Fonte de Verdade do Monorepo

## Contexto
O monorepo hoje contém superfícies "core" e "legadas" convivendo lado a lado. As duplicações reais que mais confundem operação e engenharia são:

- `@birthub/database` vs `@birthub/db`
- `apps/web` vs `apps/dashboard`
- `agents/pos-venda` vs `agents/pos_venda`

Sem uma decisão explícita, a base cresce com deriva estrutural: imports cruzados, scripts quebrados e deploys apontando para superfícies erradas.

## Decisão
Adotamos um contrato de fonte de verdade executável em [`scripts/ci/workspace-contract.json`](C:/Users/Marks/Documents/GitHub/BIRTHUB-360-INNOVATION/scripts/ci/workspace-contract.json), fiscalizado por [`scripts/ci/workspace-audit.mjs`](C:/Users/Marks/Documents/GitHub/BIRTHUB-360-INNOVATION/scripts/ci/workspace-audit.mjs).

As decisões formais são:

1. `@birthub/database` é a fonte de verdade do SaaS multi-tenant e só pode ser usado nas superfícies core (`apps/api`, `apps/web`, `apps/worker`, `packages/database`, `packages/testing`).
2. `@birthub/db` permanece como schema legado de CRM e fica isolado em `apps/dashboard`, `apps/api-gateway`, `apps/agent-orchestrator` e `packages/db` até a migração dirigida.
3. `apps/web` é a interface canônica de produto e release. `apps/dashboard` é legado e não entra na lane core.
4. `agents/pos-venda` continua como runtime Python legado. `agents/pos_venda` continua como overlay de pacote/worker até consolidação futura.
5. Primitivos de tool runtime (`BaseTool`, `DbReadTool`, `DbWriteTool`, `HttpTool`, `SendEmailTool`) passam a ser consumidos via `@birthub/agents-core/tools`, e o policy engine via `@birthub/agents-core/policy/engine`, evitando a ambiguidade do barrel raiz.

## Consequências

- O contrato sai do campo implícito e passa a quebrar CI quando houver mistura indevida.
- A migração futura deixa de ser "big bang": cada domínio legado já tem perímetro definido.
- O release core continua focado em `web + api + worker`, enquanto os legados seguem em lane suportada, mas separada.
- O worker e os fluxos de execução deixam de depender de exports ambíguos de `@birthub/agents-core`, o que reduz deriva silenciosa de tipos e comportamento.

## Próximos passos

1. Migrar um domínio legado por vez de `@birthub/db` para `@birthub/database`.
2. Reduzir `apps/dashboard` a uma superfície explicitamente deprecada ou absorver seus fluxos em `apps/web`.
3. Consolidar o agente de pós-venda em um único layout quando o worker TS e o runtime Python deixarem de coexistir.
