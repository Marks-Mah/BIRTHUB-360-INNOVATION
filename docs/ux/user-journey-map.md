# Mapa de Jornada do Usuário: Agent Studio

A plataforma BirthHub360 atende a diferentes personas dentro de uma empresa (Tenant). Para garantir o sucesso da adoção (Product-Led Growth), a interface e a comunicação devem se adaptar aos objetivos específicos de cada usuário.

Este documento mapeia a jornada de três personas distintas: **Admin Técnico**, **Manager de Negócio** e **C-Level (CEO/Diretoria)**.

---

## 1. Persona: Admin Técnico (IT / DevOps / RevOps)
*Foco: Segurança, Governança, Integração e Estabilidade.*

| Fase da Jornada | Ações e Expectativas | Frustrações Potenciais (Pain Points) | Recursos do Agent Studio que Entregam Valor |
| :--- | :--- | :--- | :--- |
| **1. Setup Inicial** | Conectar APIs da empresa (Salesforce, Stripe) de forma segura. Configurar SSO (SAML) e permissões de usuários (RBAC). | Dificuldade em achar onde inserir chaves de API com segurança; ter que compartilhar senhas no Slack. | **Vault de Integrações**, Tela de Gerenciamento de Identidade, Logs de Auditoria de Acesso. |
| **2. Governança de Agentes**| Revisar agentes criados pelos Managers. Garantir que um agente de Marketing não consiga "apagar usuários" no banco (Least Privilege). | Não saber o que o agente faz "por debaixo dos panos"; "Caixa preta" de IA. | **Policy Engine (UI de Allow-Lists)**, Checklist de revisão de Prompts (Diff View), Limites de rate-limit configuráveis. |
| **3. Observabilidade** | Descobrir por que a integração XYZ quebrou. Monitorar latência e custo da API da OpenAI. | Agentes falhando silenciosamente; Logs bagunçados misturando PII com erros de código. | **Dashboard de Logs Estruturados** (filtráveis por ID do Job), Alertas de "Fila Saturada", Redação Automática de PII nos logs. |

---

## 2. Persona: Manager de Negócio (Líder de Vendas / CS)
*Foco: Eficiência Operacional, Time-to-Value (TTV), Personalização.*

| Fase da Jornada | Ações e Expectativas | Frustrações Potenciais (Pain Points) | Recursos do Agent Studio que Entregam Valor |
| :--- | :--- | :--- | :--- |
| **1. Criação / Onboarding** | Quer "contratar" um agente para resolver um gargalo (ex: Qualificar Leads). Procura soluções prontas para não ter que pensar do zero. | Tela em branco; formulários pedindo JSON ou código Python; não entender o que "LLM" significa. | **Marketplace de Templates (Agent Catalog)** baseados em função (Vendas, Suporte), Wizard guiado passo a passo. |
| **2. Configuração (Tuning)** | Ajustar o tom de voz do agente para soar como a marca da empresa. Adicionar FAQs específicas em PDF para o agente ler. | Prompt engineering não funcionar como esperado; o agente alucinar regras que não existem. | **Prompt Editor No-Code** (variáveis preenchíveis), Upload de Base de Conhecimento (RAG simplificado). |
| **3. Teste e Confiança** | Precisa ter certeza absoluta de que o agente não vai xingar um cliente antes de ligá-lo em produção. | Medo de colocar no ar e quebrar o relacionamento com clientes. | **Playground / Simulador**, Modo "Shadow" (o agente sugere, mas o humano tem que clicar para enviar - HITL). |

---

## 3. Persona: C-Level (CEO / CFO)
*Foco: Retorno sobre Investimento (ROI), Redução de Custos, Visão Estratégica.*

| Fase da Jornada | Ações e Expectativas | Frustrações Potenciais (Pain Points) | Recursos do Agent Studio que Entregam Valor |
| :--- | :--- | :--- | :--- |
| **1. Avaliação de Valor** | Entra na plataforma apenas para ver relatórios. Quer saber: "Quanto essa IA está me poupando em horas humanas?" | Dashboards técnicos focados em "Uso de Tokens" ou "Latência de Rede" que não se traduzem em dinheiro. | **Painel Executivo (Executive Summary)** focado em métricas de negócio: Horas salvas, SLA de Resolução, Tickets resolvidos 100% via IA (Deflection Rate). |
| **2. Gestão de Custos** | Analisa a fatura do mês. Quer entender por que a conta da OpenAI ou de Integrações dobrou neste mês. | Surpresas na fatura (Bill Shock); incapacidade de saber *qual* departamento gastou mais. | **Painel de FinOps (Cost Modeling)**, Gráficos de "Custo por Agente", Alertas de estouro de orçamento configurados no Policy Engine. |
| **3. Conformidade e Risco** | Quer a garantia do Admin Técnico de que a IA não vazará dados e não resultará em multas da LGPD/GDPR. | Respostas vagas; falta de certificações. | Selos visíveis de conformidade, Relatórios exportáveis de Auditoria para apresentar aos acionistas/board. |

## Resumo de Design

O Agent Studio possui uma arquitetura de Informação adaptativa:
*   A **tela inicial (Overview)** apela ao Manager e ao CEO (Dashboards de ROI e TTV rápido).
*   As abas de **Integrações** e **Segurança** (nas configurações avançadas) apelam ao Admin Técnico.
*   Nenhuma persona deve ser forçada a navegar pelo funil de outra.
