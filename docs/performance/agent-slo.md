# Service Level Objectives (SLOs) de Agentes

Para garantir a confiabilidade da plataforma BirthHub360 e alinhar as expectativas dos clientes aos níveis de assinatura, a equipe de engenharia opera sob um conjunto estrito de **Service Level Objectives (SLOs)** focados em Latência e Taxa de Sucesso (Fail Rate).

Este documento define as metas de desempenho que o Agent Core deve atingir para cada plano e como medimos essas metas.

## 1. Indicadores (SLIs) Medidos

O orquestrador mede duas métricas primárias para cada execução de agente:

*   **Latência de Execução (Execution Latency):** Tempo total (em milissegundos) desde que o orquestrador recebe o evento (webhook, API call) até a resposta final do agente estar pronta e devolvida (incluindo o tempo de enfileiramento e execução das tools, mas *excluindo* o tempo de rede do cliente).
*   **Taxa de Erro do Agente (Agent Fail Rate):** Porcentagem de execuções (Jobs) que terminam em estado de Erro (qualquer exceção não tratada ou timeout que impeça a geração da resposta final). Erros que a IA consegue se recuperar via *tool retry* com sucesso **não** contam para a taxa de erro final.

## 2. Metas de SLO por Plano (Target Thresholds)

Como detalhado no ADR-015 (Filas Compartilhadas vs Dedicadas), a arquitetura de roteamento de jobs nos permite oferecer garantias de performance diferenciadas.

### Plano FREE (Starter / Trial)
Operam em filas de baixa prioridade. Não há garantia legal (SLA), apenas metas de best-effort.
*   **Disponibilidade (Uptime Target):** 99.0%
*   **Latência (p95):** < 15 segundos.
*   **Taxa de Sucesso (Success Rate Target):** > 95% (Fail Rate < 5%).

### Plano PRO (Professional)
Operam no pool principal de workers com algoritmo de Fair Queuing para evitar noisy neighbors.
*   **Disponibilidade (SLA):** 99.9%
*   **Latência (p95):** **< 5 segundos.** (O sistema deve responder 95% dos requests em menos de 5s, assumindo uso de LLMs padrão e ferramentas não-bloqueantes).
*   **Taxa de Sucesso:** > 99.0% (Fail Rate < 1%).
*   *Nota:* O SLO de latência do plano Pro pode ser invalidado se o agente configurar o uso de APIs de terceiros letárgicas (Categoria B/C).

### Plano ENTERPRISE (Custom)
Operam em infraestrutura isolada (Dedicated Workers / Dedicated Queues), imunes a picos de tráfego de outros tenants.
*   **Disponibilidade (SLA):** 99.99%
*   **Latência (p95):** **< 2 segundos.** (Para workflows configurados para baixa latência, usando modelos menores/finetunados ou throughput provisionado).
*   **Taxa de Sucesso:** > 99.9% (Fail Rate < 0.1%).

## 3. O que acontece se o SLO não for cumprido?

Se a performance cair abaixo da meta do plano (ex: o p95 do Pro bater 8 segundos em um dia):

1.  **Error Budget (Ver `sli-error-budget.md`):** O "Orçamento de Erro" do período é consumido. Se o orçamento for esgotado, a equipe de engenharia congela o lançamento de novas features (Feature Freeze) e dedica 100% dos Sprints para resolver o problema de gargalo (Tech Debt / Reliability).
2.  **Compensação Financeira (Credits):** Para os planos com SLA em contrato (Pro/Enterprise), violações severas e sustentadas geram devolução de créditos na próxima fatura (Credit Back), conforme os Termos de Serviço.

## 4. Limitações de Responsabilidade (Exclusions)

O BirthHub360 **não** penalizará seu próprio SLO nos seguintes casos (considerados falhas externas):
*   A API da OpenAI / Anthropic está declaradamente fora do ar (Downtime do Provedor de LLM).
*   O erro foi causado por uma *Third-Party Tool* (ex: o Salesforce do cliente caiu).
*   O cliente injetou um prompt deliberadamente construído para forçar um loop infinito ou estourar a janela de contexto (comportamento abusivo). Nesses casos, o job falhará por *Hard Timeout*, mas não será deduzido do Error Budget da plataforma.
