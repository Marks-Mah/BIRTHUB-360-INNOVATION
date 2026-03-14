# Runbook: Investigação de Query Lenta em Produção (Slow Queries)

Este runbook destina-se a engenheiros on-call e desenvolvedores que precisam investigar, diagnosticar e mitigar consultas lentas (Slow Queries) no banco de dados PostgreSQL do BirthHub360 em ambientes de Produção.

Uma "Query Lenta" é definida por qualquer consulta que ultrapasse consistentemente os limites estabelecidos no SLA de Performance (`docs/performance/database-sla.md`), ou que cause pico de CPU/I/O no banco, degradando a experiência de múltiplos tenants.

## 1. Identificação Inicial (Sintomas e Alertas)

**Alertas Comuns (Via Datadog/PagerDuty):**
*   `[DB-HIGH-CPU] PostgreSQL CPU > 80% for 5m`
*   `[DB-SLOW-QUERY] p95 Latency > 500ms on endpoint X`
*   `[DB-CONNECTION-POOL] Active connections > 90% capacity`

**Ação 1: Isolar o Problema**
*   Acesse o painel de APM ou RDS Performance Insights.
*   Identifique: É uma única query pesada repetida? É um script de migração ou worker travado? É uma transação aberta segurando *Locks* (bloqueios)?

## 2. Ferramentas de Investigação no Banco

Para diagnósticos detalhados, use conexões restritas de leitura (Read Replica) ou ferramentas de observabilidade seguras. **Atenção:** Evite rodar queries analíticas complexas no banco primário durante um incidente.

### Passo 2.1: Verificar Transações e Locks Ativos
Verifique se a lentidão é causada por bloqueios em linha/tabela ou transações presas (`idle in transaction`):
```sql
-- Verificar conexões ativas durando mais de 5 segundos
SELECT pid, usename, application_name, state, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state != 'idle' AND now() - query_start > interval '5 seconds'
ORDER BY duration DESC;

-- Verificar bloqueios (Locks)
SELECT blocking_locks.pid AS blocking_pid, blocking_activity.usename AS blocking_user,
       blocked_locks.pid AS blocked_pid, blocked_activity.usename AS blocked_user,
       blocked_activity.query AS blocked_statement, blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity  ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
     AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
     AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
     AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
     AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
     AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
     AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
     AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
     AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
     AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
     AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;
```

### Passo 2.2: Identificar as Piores Queries via `pg_stat_statements`
Se não houver locks, o problema é performance pura (falta de índices ou Sequential Scans).
```sql
-- Listar as top 10 queries com maior tempo acumulado de execução (Slowest / Most Expensive)
SELECT query, calls, total_exec_time / 1000 AS total_time_ms,
       mean_exec_time AS avg_time_ms, rows, shared_blks_hit, shared_blks_read
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```
*   Dica: Observe a coluna `shared_blks_read` (leituras do disco) versus `shared_blks_hit` (leituras do cache de memória). Leituras altas de disco geralmente indicam Sequential Scans em tabelas enormes.

## 3. Análise da Query (EXPLAIN ANALYZE)

Depois de isolar a query problemática, você deve analisar seu plano de execução para entender *por que* ela é lenta.
1.  **Copie a Query Lenta.**
2.  **Substitua os Parâmetros:** Substitua os marcadores `$1`, `$2` por valores reais do tenant ou do caso problemático (extraídos dos logs).
3.  **Execute o `EXPLAIN (ANALYZE, BUFFERS)`** (Em ambiente seguro/Read Replica, se possível).

```sql
-- Nunca rode EXPLAIN ANALYZE em um UPDATE/DELETE na produção sem estar numa transação que vai dar ROLLBACK
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE tenant_id = 'T_XYZ' AND status = 'PENDING' ORDER BY created_at DESC;
```

**O que procurar na saída do EXPLAIN:**
*   `Seq Scan on "tabela"` (com `Filter:`): O banco leu a tabela inteira e descartou a maioria das linhas. Isso é ruim em tabelas com milhares/milhões de registros. Falta um índice adequado (geralmente incluindo `tenant_id`).
*   `Index Scan using "nome_do_indice"`: Bom.
*   `Bitmap Heap Scan` seguido de `Bitmap Index Scan`: Bom para recuperar múltiplas linhas, mas `Recheck Cond` não deve descartar muitos registros.
*   Loops massivos em `Nested Loop Join` quando a tabela interna não é filtrada de forma eficiente.

## 4. Mitigação e Resolução

### Ação Imediata (Mitigação)
*   Se for um Worker Background ou rotina pesada rodando fora do horário, **Pause o Worker** (ou diminua a concorrência) para liberar CPU/Connections do banco para a API pública.
*   Se for um bloqueio severo (Deadlock/Transaction presa por horas): Faça o **`pg_cancel_backend(pid)`** do processo bloqueador após confirmar o impacto com o time.
*   Se o banco estiver em Throttling de I/O (Burst Balance zerado no RDS), reduza a carga temporariamente via Rate Limits da aplicação.

### Resolução Definitiva (Pós-Incidente)
1.  **Criação de Índice (`CONCURRENTLY`):** Se a análise mostrar falta de índice, rascunhe o índice (ex: `CREATE INDEX CONCURRENTLY idx_name ON table (tenant_id, col1, col2)`) e siga a Política de Criação de Índices (`docs/policies/index-creation-policy.md`). **Nunca crie índices grandes na primária sem `CONCURRENTLY`**, pois isso bloqueia escritas.
2.  **Otimização de Código:** Mova a query do ORM para uma lógica melhor (ex: fazer a junção na aplicação, usar Batching, adicionar limitações obrigatórias e paginação de cursores em vez de Offset).
3.  **Atualizar Estatísticas:** Às vezes o otimizador do banco erra porque as estatísticas estão defasadas. Rode um `ANALYZE tabela;` (não bloqueante) na tabela problemática.
4.  **Aprovação e Deploy:** A solução (índice ou código) deve passar por Code Review, ser validada via plano de execução e migrada para a produção via CI/CD.
