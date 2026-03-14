# Memory Management & Quality Assurance (Agent Core)

Como parte das tarefas do Ciclo 4 (JULES - Fases 4.4 e 4.7 a 4.10), definimos a arquitetura para tratamento de memória, latência de agentes e validação de QA.

## 1. Gestão de Memória de Agentes (Context Window)
*   **Compressão e Truncamento de Histórico:** O Orquestrador tem um limite fixo (*Budget*) de Tokens do LLM alocado no Manifesto (`maxTokens`). Para evitar estouro do Context Window e custos descontrolados de Tokens de Entrada, adotamos a estratégia de apagar/truncar as mensagens **[1] a [N/2]**, retendo sempre a mensagem [0] (System Prompt Original) e a janela recente ([N/2+1] a [N]).
*   **PII Redaction (Regras estritas):** O histórico de conversas do Agente, salvo no banco ou transmitido para os provedores de LLMs, é anonimizado (`PII Redaction`), mascarando CPFs, Cartões de Crédito ou Tokens Confidenciais antes do cache/salvamento.

## 2. Agent Studio UI e Observability
*   **Editor de Diferenças (Diff Editor):** Instruímos a construção da Renderização do Diff Editor usando bibliotecas resilientes (`monaco-editor` ou similar em sua `v2`) focando em segurança e legibilidade do manifesto (Prevenção SSTI / XSS explicitada no Agent Studio).
*   **Service Level Indicator (SLI) de Latência:** Estipulou-se SLI rigoroso para execução do agente (Ex: Pro `< 5s` no percentil 95 (P95), Enterprise `< 2s`).
*   **Error Budget de LLM Calls:** Definimos que o "Error Budget" é de 0.5% a 2% (a depender do plano do Tenant) de falhas permissíveis mensais de resposta 5xx do provedor LLM antes do acionamento de alertas aos Oncalls e escalonamento Automático.

## 3. Qualidade (Integration, Load Test e Sign-off)
*   **Plano de Teste de Carga (Load Test):** O pacote K6 (simulando webhooks) ou Jest Concorrente será utilizado para disparar **50 jobs concorrentes** na Engine.
*   **Análise de Logs:** Na revisão final, deve-se provar a estabilidade da orquestração onde o `PlanExecutor` escala horizontalmente com HPA e o consumo de I/O em banco é otimizado sem latência cruzada.