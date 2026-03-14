1. **Auditar os itens do Ciclo 5 (Agent Packs, Marketplace, Tools)**
   - Examinar o repositório em `packages/agent-packs/`, `apps/api/`, `apps/web/` e `packages/agents-core/` para validar a existência e a robustez de cada um dos itens definidos nas tarefas `5.1` até `5.10`.
   - Validar testes, schemas, scripts geradores (MDX) e UI.
   - Atualizar a avaliação seguindo a escala: Vermelho (ausente), Azul (criado mas não avaliado), Amarelo (mock/falho/parcial) ou Verde (perfeito).
2. **Auditar os itens do Ciclo 6 (Workflows e DAG)**
   - Examinar o repositório em `packages/workflows-core/`, `apps/worker/`, `apps/web/` e Prisma schema para as tarefas de `6.1` até `6.10`.
   - Validar o motor de Workflow (Runner), limits (memória/depth), caches, React Flow, e MSW mocks.
   - Atualizar a avaliação seguindo a escala rigorosa de cores.
3. **Consolidar o Relatório de Auditoria**
   - Criar o documento de auditoria (`docs/release/JULES_AUDIT_CYCLE_3.md`) contendo a nota de cada ciclo, a justificativa e o estado final de cada item.
4. **Pre-commit Steps**
   - Garantir verificações completas antes de submeter.
5. **Submeter as Alterações**
   - Confirmar a escrita dos resultados e submeter.
