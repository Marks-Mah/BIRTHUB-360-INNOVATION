import os

content = """

---

## Ciclo 6 (Workflows e DAG)
**Nota do Ciclo: 7.5/10**

**Justificativa:** A base do motor de workflows foi muito bem construída e possui forte governança arquitetural. O schema do Prisma, o parser de DAG (que valida de forma robusta e rejeita grafos com ciclos ou inválidos), e a persistência via BullMQ (`WorkflowRunner` e transição de nós) estão perfeitamente operacionais, garantindo escalabilidade. Há também uma correta implementação de limites operacionais: `MAX_MEMORY_BYTES` no node Code e limitador de recursão (`depth <= 50`) explícito. Na interface, percebe-se a integração efetiva com React Flow, e a preparação do terreno para o visual debugger. Em contrapartida, há funcionalidades não entregues por completo ou entregues de forma mais simples (Mock):
- Nem todos os nós prometidos na fase 6.4 (Condition e UI map) e 6.5 (Injeção de variáveis, Fallback Branch) estão completamente implementados e funcionais.
- A UI configuradora de Sidebar com form auto-gerado do Schema e recursos avançados de Debug não foram mapeados integralmente.
- Integrações avançadas de triggers do EventBus e CronJob com BullMQ (fase 6.3) encontram-se ausentes/esboçadas.
- Testes E2E transversais e Smoke Test fim-a-fim integrando Workflow e Agent CEO não foram registrados no CI de forma funcional, restando apenas testes mais focados.

A nota final 7.5/10 é reflexo de um backend de Workflows sólido mas com deficiências de integração completa e de features de interface na ponta.

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

with open("docs/release/JULES_AUDIT_CYCLE_3.md", "a") as f:
    f.write(content)
