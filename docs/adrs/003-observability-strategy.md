# ADR-003: Estratégia de Observabilidade (Logs, Traces e Metrics)

## Status

Accepted

## Context

O ecossistema BirthHub 360 opera 8 agentes autônomos e serviços críticos (API Gateway, Orchestrator). Dada a natureza distribuída e assíncrona das operações (ex: um agente acionando webhooks, LLMs e bancos de dados em sequência), encontrar a raiz de um erro apenas olhando `console.log` é insustentável. Precisamos definir de forma clara a nossa stack de observabilidade e as responsabilidades de Logs, Traces e Metricas no nosso ambiente de produção (Cloud Run).

## Análise das Alternativas de Tooling

Avaliamos ferramentas nativas em nuvem (GCP Cloud Operations / AWS CloudWatch), soluções Open Source auto-hospedadas (Prometheus/Grafana/ELK) e ferramentas Enterprise SaaS (Datadog, New Relic).

- **SaaS (Datadog/New Relic)**: Excelentes integrações APM para Node/Python. Custo alto no volume projetado de requisições de Agentes de Marketing/LDR (muitos spans).
- **Auto-hospedado (Prometheus + Grafana + Loki/Elasticsearch)**: Exige infraestrutura dedicada e esforço de SRE para manter.
- **Integração Cloud-Native (Google Cloud Operations)**: Sendo o deploy primário no Cloud Run, essa stack oferece ingestão direta de Structured Logs sem sidecars, tracing automático de HTTP via OpenTelemetry ou agentes Cloud Trace e métricas nativas gratuitas/baratas.

## Decision

Decidimos adotar a stack **Cloud Native (Google Cloud Operations Suite / Stackdriver)** em Produção, estruturada com a convenção **OpenTelemetry (OTel)** no código-fonte, o que nos previne de "vendor lock-in" caso decidamos mudar para Grafana/Datadog no futuro.

### A Divisão de Responsabilidades:

1. **Metrics (Métricas)**: "O que está quebrado?"
   - Utilizadas para painéis de alto nível e geração de Alertas de SLO (ex: Taxa de Erro HTTP > 1%, Duração de workflow LangGraph P95 > 120s).
   - Implementadas via `prom-client` no Node e `prometheus_client` no Python expondo métricas nos endpoints `/metrics`.

2. **Traces (Rastreamentos)**: "Onde quebrou?"
   - Utilizados para visualizar a latência end-to-end de requisições que cruzam diferentes limites (Frontend -> Gateway -> Agent Orchestrator -> LLM -> DB).
   - O API Gateway deve iniciar um Span e passar o `Traceparent` header para que os agentes Python associem o mesmo TraceID nas execuções subsequentes.

3. **Logs Estruturados**: "Por que quebrou?"
   - Utilizados para fornecer o contexto rico na hora exata do erro.
   - Todo log DEVE ser impresso no stdout em formato **JSON** (`{"level": "error", "message": "...", "trace_id": "...", "tenant_id": "..."}`).
   - O Google Cloud Logging (ou Elasticsearch/Fluentbit na nossa stack base) automaticamente interpreta o JSON e permite buscas avançadas.

## Consequences

- É proibido utilizar `console.log` puro e prints soltos (`print("aqui")`). Desenvolvedores devem instanciar o Logger central do monorepo (Pino/Winston no TS, structlog no Python) que garante a emissão do JSON estruturado.
- Todo framework web (Express, FastAPI) deve utilizar um middleware para capturar o TraceID no header e injetá-lo no escopo local assíncrono (AsyncLocalStorage / contextvars) para que qualquer log emitido possua a tag `trace_id`.
- Aumenta a responsabilidade dos desenvolvedores para pensar na correlação de eventos através do sistema.
