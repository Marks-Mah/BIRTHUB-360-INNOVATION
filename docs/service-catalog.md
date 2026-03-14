# Catálogo de Serviços e Repositórios

> Legenda de status: 🟢 **feito** · 🟡 **precisa de melhoria** · 🔴 **sem fazer/incompleto**

| Status | Serviço/Repositório | Tipo | Dono sugerido | Dependências principais | Consumidores | Observação de status |
|---|---|---|---|---|---|---|
| 🟢 | `apps/api-gateway` | API | Platform/API | PostgreSQL, Redis, Integrations | Dashboard, clientes externos | Middleware de idempotência em webhooks e base de rotas validada/testada para evolução contínua. |
| 🟢 | `apps/agent-orchestrator` | Worker/API interna | IA/Automation | Queue, agents, DB | API Gateway, Webhooks | Fluxos críticos modelados como StateGraph executável com chamadas resilientes entre agentes. |
| 🔴 | `apps/webhook-receiver` | Ingestão | Integrations | Queue, API Gateway | Stripe/CRM/assinatura | Base criada, mas ainda sem cobertura completa de cenários de produção e idempotência fim a fim. |
| 🟢 | `apps/dashboard` | Front-end | Product Frontend | API Gateway | Times internos | Log de atividade com atualização em tempo real (Supabase) e fallback dinâmico em modo demo. |
| 🟢 | `agents/ldr` | Agente IA | Growth/SDR | LLM client, integrations | Orchestrator | Estrutura, ferramentas e testes presentes. |
| 🟢 | `agents/sdr` | Agente IA | Sales Ops | LLM client, CRM | Orchestrator | Estrutura, ferramentas e testes presentes. |
| 🟢 | `agents/ae` | Agente IA | Sales | LLM client, calendar, CRM | Orchestrator | Estrutura, ferramentas e testes presentes. |
| 🟢 | `agents/financeiro` | Agente IA | Finance | Pagamentos/NF-e | Orchestrator | Estrutura, ferramentas e testes presentes. |
| 🟢 | `agents/juridico` | Agente IA | Legal Ops | Assinatura eletrônica | Orchestrator | Estrutura, ferramentas e testes presentes. |
| 🟢 | `agents/marketing` | Agente IA | Marketing Ops | Ads APIs | Orchestrator | Estrutura, ferramentas e testes presentes. |
| 🟢 | `agents/analista` | Agente IA | BI/Data | DB/analytics | Orchestrator | Estrutura, ferramentas e testes presentes. |
| 🟢 | `agents/pos-venda` | Agente IA | CS Ops | CRM/comunicação | Orchestrator | Estrutura, ferramentas e testes presentes. |
| 🟢 | `packages/shared-types` | Package compartilhado | Platform | TypeScript | Apps e Agents TS | Pacote criado e funcional para contratos compartilhados. |
| 🟢 | `packages/llm-client` | Package compartilhado | IA Platform | Gemini SDK | Agents/Orchestrator | Cliente LLM centralizado e disponível. |
| 🟢 | `packages/queue` | Package compartilhado | Platform | Redis/BullMQ | Orchestrator/Webhooks | Definições e utilitários de fila implementados. |
| 🟢 | `packages/integrations` | Package compartilhado | Integrations | SDKs externos | Gateway/Agents | Camada inicial de integrações implementada. |
| 🟢 | `packages/utils` | Package compartilhado | Platform | Node/TS | Monorepo | Utilitários base implementados e reutilizáveis. |
