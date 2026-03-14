# Database Performance SLA (p95 Máximo por Operação)

Este documento define os Service Level Agreements (SLA) internos e as metas de latência para consultas ao banco de dados (PostgreSQL) na plataforma BirthHub360. Os tempos são medidos *no lado do servidor (tempo de execução da query)*, excluindo a latência de rede entre o cliente e a API, e referem-se ao percentil 95 (p95).

O descumprimento consistente destas metas acionará alertas de degradação e a obrigatoriedade de otimização de queries, criação de índices ou reformulação da lógica de acesso a dados (cache, background jobs, materializações).

## 1. Contexto das Métricas (Percentil 95)

Por que p95?
A meta é que 95% das operações do tipo especificado terminem dentro do tempo limite (SLA) e apenas 5% (as "outliers", geralmente causadas por cold caches, cold starts, gargalos de rede e queries pesadas complexas) excedam este valor.

## 2. Metas de Performance por Categoria de Endpoint/Operação

### 2.1. Operações Críticas de Leitura (SLA p95: <= 50ms)

**Descrição:** Consultas simples para retornar um único recurso ou listar registros paginados recentes e cacheados, necessárias para o carregamento inicial da UI, renderização em painéis rápidos, ou verificação de chaves e permissões.
**Exemplos:**
*   `GET /api/v1/users/{id}` (Find by ID / RLS Tenant Match)
*   `GET /api/v1/workspaces/current` (Lookup indexado simples)
*   `GET /api/v1/orders?limit=20` (Busca em índice de paginação padrão, top records)
**Requisitos Técnicos:**
*   Requerem *Index Scans* perfeitos ou acesso via Memória RAM (Redis/Cache).
*   Não podem conter *JOINs* não otimizados em tabelas gigantescas ou *Seq Scans*.

### 2.2. Operações de Escrita Padrão (SLA p95: <= 150ms)

**Descrição:** Criação, atualização, ou exclusão de um ou poucos registros que exigem a manutenção da integridade referencial, RLS e gravação em disco transacional (WAL do Postgres).
**Exemplos:**
*   `POST /api/v1/orders` (Insert com validação de foreign keys)
*   `PUT /api/v1/users/{id}` (Atualização simples de entidade)
*   `DELETE /api/v1/items/{id}` (Exclusão com verificação de constraints)
**Requisitos Técnicos:**
*   A transação deve ser pequena e enxuta.
*   Custo de manutenção de índices limitados pelo número de colunas atualizadas.

### 2.3. Consultas Analíticas e Buscas Complexas (SLA p95: <= 400ms)

**Descrição:** Operações que envolvem varredura extensa, agrupamentos (GROUP BY), junções múltiplas em larga escala ou busca textual completa (Full-Text Search) que precisam ser devolvidas de forma síncrona.
**Exemplos:**
*   `GET /api/v1/reports/sales-this-month` (Agregação de milhares de registros via RLS)
*   `GET /api/v1/customers?search="termo livre"` (Trigram/FTS index scans)
*   Exportações em pequena escala.
**Requisitos Técnicos:**
*   Exigem índices compostos avançados (`INCLUDE`, BRIN ou GIN/GiST para texto).
*   Devem possuir limites rígidos de Timeout e usar limites e paginação profundos.

### 2.4. Processamento Batch e Exportações (SLA p95: Assíncrono / Background)

**Descrição:** Operações pesadas (Bulks de centenas/milhares de inserts, importação de CSV, recálculo total de scores). Estas operações quebram os SLAs HTTP tradicionais e **NÃO DEBEM** ser executadas de forma síncrona nos web-workers principais.
**Exemplos:**
*   `POST /api/v1/imports/csv`
*   Geração de relatórios anuais (PDF/Excel) de faturamento de tenants Enterprise.
**SLA Aplicável:**
*   *API Response (Ack):* <= 100ms (HTTP 202 Accepted, job enfileirado).
*   *Job Completion:* Varia conforme o tamanho do lote, medido nas métricas do Worker/Queue, nunca bloqueando o loop principal do servidor ou do banco.

## 3. Monitoramento e Alertas (Thresholds)

*   O monitoramento oficial destas métricas é coletado através de ferramentas de APM (Datadog/New Relic) e plugins de banco (pg_stat_statements).
*   Caso um endpoint listado na categoria Crítica/Padrão (1 ou 2) viole a regra do p95 de maneira consistente (acima de 5 minutos contínuos na janela móvel), o sistema deve gerar um evento de `WARNING`.
*   As métricas não são absolutas por cliente: Tenants com dezenas de milhões de registros podem ocasionalmente degradar para a categoria Analítica; nestes casos, investigações do *Runbook de Slow Queries* devem ser acionadas.
*   Os bloqueios transacionais (Lock Waits) acima de 1 segundo violarão qualquer SLA deste documento e exigem auditoria imediata.