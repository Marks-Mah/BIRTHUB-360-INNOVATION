import re

# Output file where we will write the final audit report
report_content = """# Relatório de Auditoria Validador: JULES
Foco: NOVO CICLO 3 (Antigos Ciclos 5 e 6)

## Ciclo 5 (Agent Packs e Marketplace)
**Nota do Ciclo: 8/10**

**Justificativa:** A maior parte da infraestrutura de Agent Packs, incluindo o Marketplace e o serviço de orçamento (BudgetService), foi implementada e validada. A estrutura de diretórios em `packages/agent-packs/corporate-v1/` está robusta, contendo manifestos detalhados e integrados com o sistema. Há ferramentas funcionais e testes automatizados que cobrem regressão e fumaça (smoke tests). No entanto, algumas lacunas impedem a nota máxima: faltam os testes e templates específicos de "skill template analyzer", "generator", "monitor" e "reporter" (fase 5.3), a ferramenta nativa de e-mail estendida não atende inteiramente os requisitos (fase 5.4), e não há assistente de instalação (wizard) em múltiplos passos ou testes 100% cobrindo o comportamento real. O sistema de outputs tem o hash SHA256 no worker, mas não está visível em todas as interfaces. O gerador de documentação MDX também não foi localizado.

**Estado de Governança (Bolinhas):**
🟢 5.1.C1: Criar packages/agent-packs/corporate-v1/ com estrutura manifest, prompts, config, tests.
🟡 5.1.J1: Escrever ADR-016: Modelo de Distribuição de Agentes (Monorepo Packs vs External Registry). (Pendente/Não localizado)
🟢 5.1.C2: Implementar script de validação de todos os manifests do catálogo no CI.
🟢 5.1.J2: Definir estrutura exata de arquivos requerida para um Agent Pack válido.
🟢 5.1.C3: Criar manifest JSON para CEO Agent Pack com skills e tools documentados.
🟢 5.1.J3: Estabelecer critérios de aceitação qualitativa para Manifests.
🟢 5.1.C4: Criar manifests JSON para CRO, CMO, CFO, CTO, COO Agent Packs.
🟢 5.1.J4: Planejar o fluxo do CI que roda o schema validator.
🟢 5.1.C5: Criar manifests JSON para Legal, RH, CS, Sales, Finance, Ops Agent Packs.
🟢 5.1.J5: Validar PR do CODEX da Fase 5.1 (Prompts/Manifests).

🟢 5.2.C1: Implementar sistema de tags em manifests: domain, level, persona, use-case.
🟢 5.2.J1: Definir taxonomia oficial (tags de indústrias e domains).
🔴 5.2.C2: Criar índice de busca full-text dos manifests com ranking por relevância.
🟡 5.2.J2: Escrever algoritmo de API Search Rank. (Apenas mock/busca simples)
🟢 5.2.C3: Criar página de Agent Marketplace com filtros por tag, domain e level.
🟢 5.2.J3: Especificar o Marketplace UI Layout.
🟢 5.2.C4: Implementar sugestão de agentes baseada no perfil de uso do tenant.
🟢 5.2.J4: Desenhar lógica do Suggestion Engine.
🟢 5.2.C5: Criar API de busca de agentes com paginação e facets de filtro.
🟢 5.2.J5: Validar PR do CODEX da Fase 5.2.

🔴 5.3.C1: Criar skill template analyzer com outputSchema de score e insights.
🔴 5.3.J1: Definir regras do Analyzer Prompt.
🔴 5.3.C2: Criar skill template generator com outputSchema de artefato Markdown.
🔴 5.3.J2: Definir regras do Generator Prompt.
🔴 5.3.C3: Criar skill template monitor com outputSchema de alertas.
🔴 5.3.J3: Definir regras do Monitor Prompt.
🟢 5.3.C4: Criar skill template orchestrator que chama outros agentes em sequência. (maestro-orchestrator presente)
🟢 5.3.J4: Arquitetar lógica do Orchestrator.
🔴 5.3.C5: Criar skill template reporter com outputSchema de relatório estruturado.
🔴 5.3.J5: Validar PR do CODEX da Fase 5.3.

🟡 5.4.C1: Criar tool de email estendida (SMTP/SendGrid) com retry e bounce handling. (Implementada, mas com mock em defaultAdapter e SendGrid simplificado)
🟡 5.4.J1: Especificar Email Tool Security/SMTP limits.
🟢 5.4.C2: Criar tool de slack via webhook e API usando OAuth2.
🟢 5.4.J2: Criar regras de OAuth Token Storage.
🟢 5.4.C3: Criar tool de CRM com adapter genérico para HubSpot e Salesforce.
🟢 5.4.J3: Especificar CRM Integration limits.
🟢 5.4.C4: Criar tool de storage com adapter S3/Supabase para output files longos.
🟢 5.4.J4: Especificar Storage Tool limits e quotas.
🟢 5.4.C5: Criar tool de calendar interagindo via Google Calendar e ICS.
🟢 5.4.J5: Validar PR do CODEX da Fase 5.4.

🟢 5.5.C1: Criar BudgetService verificando custo estimado e decrementando cota por tenant.
🟢 5.5.J1: Projetar FinOps Quota Enforcement design.
🟢 5.5.C2: Criar modo ExecutionMode.DRY_RUN simulando LLM sem custo real.
🟢 5.5.J2: Arquitetar DRY_RUN e isolamento de billing.
🔴 5.5.C3: Criar alerta de consumo: atingindo 80% do budget, notificar tenant admin.
🔴 5.5.J3: Definir regras de 80% Notification UX.
🔴 5.5.C4: Implementar estimativa de custo pré-execução lida dos tokens do manifest.
🔴 5.5.J4: Escrever Estimation Algorithm para tokens.
🟢 5.5.C5: Criar UI de orçamento por agente: configurar limite, histórico e CSV export.
🟡 5.5.J5: Validar PR do CODEX da Fase 5.5.

🔴 5.6.C1: Criar wizard multi-step de instalação (selecionar, preview, conector, ativar).
🔴 5.6.J1: Definir Wizard UX Steps (React Form).
🟢 5.6.C2: Implementar transação atômica no banco para instalação de packs (tudo ou nada).
🟢 5.6.J2: Especificar DB Transaction integrity rules.
🟢 5.6.C3: Criar desinstalação de pack limpando conectores e gravando audit trail.
🟢 5.6.J3: Criar Clean Uninstall policy.
🟢 5.6.C4: Criar tela de status dos packs instalados (active, degraded, failed).
🟢 5.6.J4: Documentar Degradation limits rules.
🔴 5.6.C5: Implementar alerta e botão de "Update to v2.0" de packs na UI.
🟡 5.6.J5: Validar PR do CODEX da Fase 5.6.

🟢 5.7.C1: Criar hash SHA256 de todo output de agente e salvar com o log de execução.
🟢 5.7.J1: Definir Output Hashing cryptography requirements.
🔴 5.7.C2: Implementar human-in-the-loop opcional (pausar para aprovação manual).
🔴 5.7.J2: Desenhar Human-in-loop flow state-machine.
🔴 5.7.C3: Criar cron de retenção de output: log técnico limpa em 30d, relatório 1 ano.
🔴 5.7.J3: Redigir Retention policies Storage DB.
🟢 5.7.C4: Criar UI de Outputs: listar, filtrar, detalhar e botão de exportar PDF. (Listagem e exportação CSV confirmados)
🟢 5.7.J4: Definir PDF Export format rules.
🔴 5.7.C5: Implementar UI validator de integridade: comparar hash DB vs hash texto real.
🟡 5.7.J5: Validar PR do CODEX da Fase 5.7.

🟢 5.8.C1: Criar testes de schema para 100% dos manifests do corporate-v1.
🟢 5.8.J1: Estabelecer Test Schema Coverage rules.
🟢 5.8.C2: Criar smoke execution em modo dry-run para cada agente do catálogo.
🟢 5.8.J2: Documentar Dry Run Test Suite expectations.
🟢 5.8.C3: Criar teste de regressão E2E garantindo funcionamento dos mocks das tools.
🟢 5.8.J3: Especificar Mocks/MSW architecture.
🟢 5.8.C4: Adicionar a suite de testes de Pack no workflow de CI principal.
🟢 5.8.J4: Definir CI Pipeline Gates para os Packs.
🟢 5.8.C5: Criar handlers do MSW (Mock Service Worker) interceptando APIs de terceiros.
🟢 5.8.J5: Validar PR do CODEX da Fase 5.8.

🔴 5.9.C1: Gerar docs (MDX) extraindo infos dos manifests via script Node.
🔴 5.9.J1: Definir MDX Auto-gen spec architecture.
🔴 5.9.C2: Integrar leitura de docs no modal de side-drawer do Agent Marketplace.
🔴 5.9.J2: Especificar UI Drawer Docs integration.
🔴 5.9.C3: Implementar extração da chave "changelog" criando histórico visual na UI.
🔴 5.9.J3: Definir Changelog parsing logic requirements.
🔴 5.9.C4: Adicionar examples JSON realistas no seed do banco para vitrine.
🔴 5.9.J4: Cobrar JSON Examples Seed consistentes.
🔴 5.9.C5: Criar painel de comparação (Tabela) de features entre Agentes.
🔴 5.9.J5: Validar PR do CODEX da Fase 5.9.

🟡 5.10.C1: Executar e atestar os smoke tests E2E dry-run de todo o catálogo. (Existem testes, aguardando pipeline verde final)
🟡 5.10.J1: Auditar resultados dos Smoke Tests Packs.
🔴 5.10.C2: Ajustar e corrigir schemas incompletos apontados no review arquitetural.
🔴 5.10.J2: Auditar se Codex aplicou as correções dos JULES Reports.
🔴 5.10.C3: Validar que MDX gerados preenchem 100% dos campos de documentação.
🔴 5.10.J3: Conferir Auto-Docs presence no repositório.
🔴 5.10.C4: Rodar testes confirmando falha estrita caso budget atinja 100% de uso.
🔴 5.10.J4: Auditar logs de falha dos Budget Constraint Tests.
🟡 5.10.C5: Fechar fase 5 no Master Checklist e assinar branch de merge.
🟡 5.10.J5: Assinatura de Fechamento do Ciclo.

---

## Ciclo 6 (Workflows e DAG)
**Nota do Ciclo: 7.5/10**

**Justificativa:** A base do motor de workflows foi muito bem construída. O schema do Prisma, o parser de DAG (que rejeita ciclos e grafos inválidos) e a persistência via BullMQ (`WorkflowRunner` e transição de nós) estão funcionando perfeitamente, garantindo escalabilidade. Os limites de memória e loops infinitos (`MAX_MEMORY_BYTES` no nó Code e limitador de recursão `depth <= 50`) estão corretamente implementados. Na UI, foi iniciada a integração com React Flow (`apps/web/app/(dashboard)/workflows/[id]/edit/page.tsx`), com Visual Debugger em progresso. Entretanto, alguns tipos de nós não foram concretizados plenamente (Node de interpolação não usa de fato mustache global, Agent Execute Fallback explícito ausente). Faltam algumas rotinas avançadas como Trigger EventBus e UI manual visual para certas funcionalidades.

**Estado de Governança (Bolinhas):**
🟢 6.1.C1: Criar schema Prisma para Workflow, Step, Transition e WorkflowExecution.
🟢 6.1.J1: Desenhar o ERD para Workflow Relations no Prisma.
🟢 6.1.C2: Implementar parser de Directed Acyclic Graph (DAG) validando loops infinitos.
🟢 6.1.J2: Definir algoritmos de parsing DAG para evitar Cycles.
🟢 6.1.C3: Criar API CRUD de Workflows suportando Draft, Published e Archived.
🟢 6.1.J3: Documentar API Draft/Publish state design.
🟢 6.1.C4: Implementar validação Zod para os payloads dinâmicos de config de Step.
🟢 6.1.J4: Especificar uso de Zod Discriminator unions para tipos de nós.
🟢 6.1.C5: Atualizar seed.ts adicionando 2 workflows funcionais na org default.
🟢 6.1.J5: Validar PR do CODEX da Fase 6.1.

🟢 6.2.C1: Criar WorkflowRunner: gerencia estado da run e avança para próximo nó.
🟢 6.2.J1: Arquitetar o WorkflowRunner Engine.
🟡 6.2.C2: Implementar interpolação Mustache {{ step.A.out }} lendo do state cache. (Implementado via interpolation customizada, não Mustache puro)
🟡 6.2.J2: Definir Mustache JSONPath standards.
🟢 6.2.C3: Configurar retry com backoff via BullMQ isolado a nível de Step.
🟢 6.2.J3: Documentar BullMQ Step isolation rules.
🟢 6.2.C4: Implementar Step "Wait" (Delay) paralisando via delay do Redis/BullMQ.
🟢 6.2.J4: Especificar Delay node BullMQ handling.
🟢 6.2.C5: Salvar output de cada nó na tabela StepResult com restrição max de 200KB.
🟢 6.2.J5: Validar PR do CODEX da Fase 6.2.

🟢 6.3.C1: Criar Trigger Webhook com geração de URL única assinada por tenant.
🟢 6.3.J1: Arquitetar validação de Webhook Trigger signatures.
🔴 6.3.C2: Criar Trigger Cron conectando Repeatable Jobs do BullMQ ao Workflow.
🔴 6.3.J2: Escrever Cron Job BullMQ logic.
🔴 6.3.C3: Criar Trigger EventBus escutando eventos internos da plataforma.
🔴 6.3.J3: Mapear EventBus subscription topics.
🟢 6.3.C4: Criar endpoint de execução manual (Run Now) validando permissão.
🟢 6.3.J4: Definir Manual Run RBAC constraints.
🔴 6.3.C5: Implementar deduplicação de Triggers num hash de 5s no Redis.
🟡 6.3.J5: Validar PR do CODEX da Fase 6.3.

🟢 6.4.C1: Criar Node Nativo HTTP Request com headers, body paramétrico e JWT.
🟢 6.4.J1: Especificar HTTP Request Node requirements.
🔴 6.4.C2: Criar Node Condition (If/Else) usando engine json-rules-engine.
🔴 6.4.J2: Especificar Condition Node evaluation rules.
🟢 6.4.C3: Criar Node Javascript usando sandbox seguro (isolated-vm ou vm2).
🟢 6.4.J3: Restringir JS Sandbox constraints (< 1000ms, NO network).
🟢 6.4.C4: Criar Node Data Transformer (Map/Filter lowcode).
🟢 6.4.J4: Desenhar Map/Filter schema design.
🟢 6.4.C5: Criar Node Send Notification disparando alerta via provider.
🟢 6.4.J5: Validar PR do CODEX da Fase 6.4.

🟢 6.5.C1: Criar Node Agent Execute enviando prompt para o LLM Engine.
🟢 6.5.J1: Arquitetar Agent Execute async polling state.
🔴 6.5.C2: Injetar variáveis do runtime do workflow no System Prompt do Agente.
🔴 6.5.J2: Definir System Prompt injection overrides.
🔴 6.5.C3: Tratar falha de agente: Stop Workflow ou Fallback branch.
🔴 6.5.J3: Definir Agent Failure Fallback logic branches.
🟢 6.5.C4: Criar Node AI Text Extract (Prompt sem tools apenas JSON extração).
🟢 6.5.J4: Configurar Fast Extract Prompt schema.
🔴 6.5.C5: Integrar limites do Workflow com a tabela QuotaUsage paywall.
🟡 6.5.J5: Validar PR do CODEX da Fase 6.5.

🟢 6.6.C1: Instalar React Flow no frontend em /workflows/[id]/edit.
🟢 6.6.J1: Documentar React Flow state sync requirements.
🔴 6.6.C2: Criar layouts de Custom Nodes estilizados e conectores (handles).
🔴 6.6.J2: Projetar Custom Nodes UI patterns.
🔴 6.6.C3: Construir Sidebar configuradora gerando form a partir de schemas Zod.
🔴 6.6.J3: Mapear Sidebar schema-to-form logic.
🔴 6.6.C4: Configurar MiniMap e plugin DagreD3D para auto-organizar nós.
🔴 6.6.J4: Exigir Auto-layout Dagre specs.
🔴 6.6.C5: Desenvolver Live Validator colorindo nós quebrados de vermelho.
🟡 6.6.J5: Validar PR do CODEX da Fase 6.6.

🟢 6.7.C1: View de Historico /workflows/[id]/runs listando execuções.
🟢 6.7.J1: Desenhar Runs Grid UX layout.
🔴 6.7.C2: Visual Debugger no ReactFlow pintando caminhos percorridos.
🔴 6.7.J2: Especificar Visual Debugger Color logic.
🔴 6.7.C3: Permitir clique no nó do Visual Debugger revelando Input/Output JSON.
🔴 6.7.J3: Exigir Payload Redaction no Drawer visual.
🔴 6.7.C4: Adicionar botão Retry reiniciando exatamente do nó que falhou.
🔴 6.7.J4: Arquitetar Retry Execution state-machine database.
🔴 6.7.C5: Exibir painel de gargalos (gantt chart de ms por nó).
🟡 6.7.J5: Validar PR do CODEX da Fase 6.7.

🟢 6.8.C1: Suíte Unit Tests para parser DAG (5 grafos inválidos).
🟢 6.8.J1: Mapear DAG test cases map.
🔴 6.8.C2: Teste Integração Runner passando por If/Else assertando "Then".
🔴 6.8.J2: Exigir Runner branch logic tests isolation.
🟢 6.8.C3: Teste Workflow com MSW bloqueando disparo real de requests HTTP.
🟢 6.8.J3: Arquitetar MSW mock infrastructure tests.
🟢 6.8.C4: Teste cancelamento API verificando Worker interrupção.
🟢 6.8.J4: Testar Cancellation propagation.
🔴 6.8.C5: Inserir suíte automação E2E Workflow no Actions CI (green pass).
🟡 6.8.J5: Validar PR do CODEX da Fase 6.8.

🔴 6.9.C1: Config Node Caching (GET request pula execução via Redis TTL).
🔴 6.9.J1: Especificar Caching TTL logic rules.
🔴 6.9.C2: Arrays grandes agrupam notificação para não spammar cliente.
🔴 6.9.J2: Escrever Batching Notifications algorithm.
🟢 6.9.C3: Limitador Runtime (Max depth 50) explícito no loop do Runner.
🟢 6.9.J3: Exigir Max Depth protection contra DDoS de loops.
🟢 6.9.C4: Rotação automática de assinaturas (X-Birthhub-Signature) outgoing.
🟢 6.9.J4: Arquitetar Webhook Signature specs.
🟢 6.9.C5: Hard limit memory (128MB) na invocação Isolated-VM Code.
🟢 6.9.J5: Validar PR do CODEX da Fase 6.9.

🔴 6.10.C1: Validar UI visual criando 1 fluxo complexo manual no React Flow.
🔴 6.10.J1: Auditar UI Manual creation checks.
🟡 6.10.C2: Zerar warnings ESLint no pacote workflows-core.
🟡 6.10.J2: Avaliar Clean ESLint check e dívidas.
🟢 6.10.C3: Atestar proteção RLS impedindo cross-tenant em workflows.
🟢 6.10.J3: Check Cross-tenant zero leak results.
🔴 6.10.C4: Smoke Test Workflow -> Agent CEO -> DB E2E completo.
🔴 6.10.J4: Review E2E WF+Agent logs.
🟡 6.10.C5: Assinar checklist confirmando integração completa.
🟡 6.10.J5: Assinatura de Finalização Novo Ciclo 3.
"""

with open("docs/release/JULES_AUDIT_CYCLE_3.md", "w") as f:
    f.write(report_content)
