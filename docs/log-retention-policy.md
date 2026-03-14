# Política de Retenção de Logs e Dados de Observabilidade

O BirthHub 360, ao operar 8 agentes baseados em IA que interagem com milhares de leads e processam transações financeiras, gera um volume massivo de eventos, logs e métricas. Para balancear compliance, debugabilidade e controle de custos de infraestrutura em nuvem, esta política define o ciclo de vida (retenção e expurgo) dos dados de observabilidade.

## Diretrizes de Retenção por Tipo de Dado

### 1. Logs Operacionais (Structured Logs)

Logs de stdout/stderr das aplicações (API Gateway, Workers, Dashboard).

- **Ambiente de Produção (`prod`):**
  - **Retenção Hot (Acesso Rápido):** 30 dias. (Onde 99% das investigações de incidentes ocorrem).
  - **Retenção Cold (Archive Storage):** 1 ano. Arquivamento automático via Sink (ex: GCS Bucket / S3) após os primeiros 30 dias para fins de auditoria regulatória e compliance LGPD/Financeira. Expurgado definitivamente no dia 366.
- **Ambientes Staging/QA (`staging`, `qa`):**
  - Retenção máxima de 7 dias (Hot). Sem arquivamento a longo prazo.
- **Ambiente de Dev Local (`dev`):**
  - Logs temporários locais apenas. Sem envio de stream para o provedor de nuvem para evitar custos.

### 2. Distributed Tracing (Spans)

Dados de latência end-to-end e grafos de chamadas (OpenTelemetry).

- **Ambiente de Produção (`prod`):**
  - **Retenção:** 30 dias. Traces mais antigos são muito volumosos (GB/TB de dados gerados) e perdem a utilidade analítica detalhada com as constantes atualizações de código.
- **Ambientes Não-Prod:**
  - Desativado por padrão para reduzir custos de ingestão, ou amostrado agressivamente (ex: `0.01%`).

### 3. Métricas (Time Series Metrics)

Métricas agregadas como CPU, Memória, Requisições HTTP (Prometheus/Cloud Monitoring).

- **Ambiente de Produção (`prod`):**
  - Métricas retidas por **13 meses** para possibilitar comparações "Year-over-Year" (YoY) de performance e capacidade em painéis executivos.
  - Granularidade:
    - Primeiros 30 dias: a cada 10 segundos.
    - Após 30 dias: rollup automático para resolução de 1 minuto ou 5 minutos para economizar espaço de armazenamento.

### 4. Application Audit Trail (Tabela DB `AgentLog`)

Além dos logs de infraestrutura, os eventos críticos de negócio dos Agentes (Handoffs, Respostas de Prompt final, Transições de Estado de Faturamento) gravados no Banco de Dados via Prisma (Tabela `AgentLog`).

- **Retenção de Tabela:** O banco de dados preserva o histórico estruturado dos eventos atrelados ao `Lead` ou `Account` ativamente.
- Se um tenant for deletado (ver `ADR-005` migrations policy), esses registros são sujeitos a hard-delete. Contudo, dados vitais anonimizados de faturamento precisam ser retidos de acordo com exigências legais locais de contabilidade (usualmente 5 a 10 anos).

## Estimativa de Custos e Alertas

- **Custos:** Logs indexados para "busca quente" (`Hot`) representam o maior ofensor de custos (muitos provedores cobram por GB ingerido e armazenado).
- **Purge Automático:** Nenhum script manual é necessário para apagar os logs. Os recursos do provedor em nuvem são provisionados via Terraform com _Lifecycle Rules_ que executam o delete ou transição de tier automaticamente.
