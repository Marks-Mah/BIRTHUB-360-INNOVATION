# Análise de Custo e Latência por Ferramenta (Tool Cost-Latency)

A rentabilidade do BirthHub360 como SaaS depende não apenas de cobrar pelo tempo de orquestração do LLM, mas também de gerenciar com precisão o custo indireto e os recursos computacionais (e financeiros diretos) consumidos pelas ferramentas (tools) chamadas pelos agentes.

Esta análise categoriza as ferramentas por seus vetores de custo e latência, estabelecendo a base para o modelo de **Pricing (Precificação) baseado em Consumo (Usage-Based)** e **Rate Limiting**.

## 1. Categorias de Ferramentas por Vetor de Custo

As ferramentas (`tools`) são classificadas em três categorias de impacto:

### Categoria A: "Gratuitas" ou Internas de Baixo Impacto (Low Cost/Low Latency)
*   **Definição:** Operações que consultam bancos de dados internos com índices otimizados, processam dados na RAM, ou realizam cálculos matemáticos/lógicos simples no mesmo nó do worker.
*   **Exemplos:** `format_date`, `validate_cpf`, `get_current_tenant_config`, buscas SQL em tabelas pequenas (`users` e `preferences`).
*   **Custo Médio/Chamada:** < $0.0001
*   **Latência Padrão:** < 50ms (p95)
*   **Gestão de Pricing:** Estas ferramentas não são cobradas individualmente. O custo de sua execução é absorvido pelo *Compute Base* (tempo do worker) que já é repassado no valor do LLM ou no plano de assinatura fixo.

### Categoria B: Operações Intensivas ou Armazenamento (Medium Cost/High Latency)
*   **Definição:** Operações que envolvem varreduras grandes em disco, ingestão de dados pesados, processamento intensivo de CPU/GPU (mas sem custo fixo por chamada API de terceiros), ou geração de embeddings/PDFs grandes.
*   **Exemplos:** `search_memory` (RAG em VectorDB grande), `generate_pdf_report_100_pages`, consultas SQL analíticas (Data Warehouse/BigQuery).
*   **Custo Médio/Chamada:** $0.001 - $0.05
*   **Latência Padrão:** 500ms - 15.000ms (p95)
*   **Gestão de Pricing:** Devido à latência e consumo de I/O, o abuso dessas ferramentas pode onerar a infraestrutura. O modelo de *Pricing* deve impor cotas rígidas por mês (Rate Limits pesados) e cobrar *Overage* (excedente) baseado em volume de processamento ou "unidades de computação", dependendo do plano do tenant.

### Categoria C: API de Terceiros e Custo Direto (High Cost/Variable Latency)
*   **Definição:** Ferramentas que invocam serviços de parceiros/provedores onde o BirthHub360 paga uma taxa em dólar ($) **por chamada efetuada**.
*   **Exemplos:**
    *   `send_sms_twilio` (~$0.01 por SMS)
    *   `google_search_serper` (~$0.001 a $0.002 por query)
    *   `verify_background_check_serasa` (~$0.50 a $2.00 por CPF)
*   **Custo Médio/Chamada:** $0.01 a $5.00+
*   **Latência Padrão:** 200ms a 5.000ms (p95)
*   **Gestão de Pricing:** Estas ferramentas geram **Pass-Through Costs** diretos.
    *   A plataforma DEVE rastrear o custo unitário via um evento de telemetria (ex: log `event="tool_execution", cost=0.015`).
    *   O plano do Tenant deve prever uma carteira ("Credits") explícita para o uso da Categoria C.
    *   **Circuit Breaker Financeiro:** Se os créditos do Tenant acabarem, a chamada da tool Categoria C falhará com Erro Lógico (`PaymentRequired`), interrompendo o agente graciosamente.

## 2. Modelagem de Latência e "Compute Waste"

A latência afeta o custo indiretamente por causa do **bloqueio do Worker**.

Se um Worker (Pod K8s) custa $X/hora para rodar, o verdadeiro custo de uma tool da Categoria C não é apenas a taxa da API de terceiros, mas também o tempo que a thread/processo passa ociosa aguardando a resposta HTTP (I/O Bound).

*   **Problema (Compute Waste):** Uma ferramenta mal otimizada (`fetch_heavy_data` de 30 segundos) bloqueia o processamento de 600 outras requisições rápidas de 50ms que poderiam ter sido executadas naquela mesma thread do worker, reduzindo o *throughput* do cluster.
*   **Solução (Asynchronous Execution):** Todas as chamadas de tools de I/O bloqueante (Categorias B e C) devem usar `async/await` no framework Python do agente para liberar a thread do event loop do sistema operacional (permitindo concorrência massiva no mesmo processo e barateando o Custo/Job). O framework do agente (`tools framework`) deve usar clientes HTTP assíncronos (como `httpx.AsyncClient` ou `aiohttp`).

## 3. Conclusão para Pricing Modeling

Para desenvolver o modelo de negócio (Plano Free vs Pro vs Enterprise), a equipe de faturamento deve se basear nos eventos de telemetria (`ToolExecutionEvent`) para consolidar a fatura do mês. Ferramentas Premium (Cat C) só devem estar habilitadas no Policy Engine para contas com cartão de crédito válido e/ou limites contratuais vigentes (Enterprise), evitando falência por uso fraudulento ou robôs autônomos.
