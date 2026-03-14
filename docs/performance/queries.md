# Queries Críticas do Ciclo 2

Data de preparação: 2026-03-13

## Status

O catálogo das 10 queries críticas e os comandos de `EXPLAIN ANALYZE` foram preparados abaixo. A coleta do plano real em Postgres local ficou bloqueada neste ambiente porque não há Docker/Postgres disponível, então os trechos de plano devem ser executados no banco alvo antes do ateste final do ciclo.

## 1. Members por tenant

```sql
EXPLAIN ANALYZE
SELECT *
FROM members
WHERE "tenantId" = $1
ORDER BY id
LIMIT 50;
```

Índice esperado: `members_tenantId_id_idx`

## 2. Members por tenant + status

```sql
EXPLAIN ANALYZE
SELECT *
FROM members
WHERE "tenantId" = $1
  AND status = 'ACTIVE';
```

Índice esperado: `members_tenantId_status_idx`

## 3. Workflows ativos por tenant

```sql
EXPLAIN ANALYZE
SELECT *
FROM workflows
WHERE "tenantId" = $1
  AND status = 'ACTIVE'
ORDER BY id
LIMIT 100;
```

Índice esperado: `workflows_tenantId_status_idx`

## 4. Agents por tenant

```sql
EXPLAIN ANALYZE
SELECT *
FROM agents
WHERE "tenantId" = $1
ORDER BY id
LIMIT 100;
```

Índice esperado: `agents_tenantId_id_idx`

## 5. Customers por tenant + status

```sql
EXPLAIN ANALYZE
SELECT *
FROM customers
WHERE "tenantId" = $1
  AND status = 'active'
ORDER BY id
LIMIT 100;
```

Índice esperado: `customers_tenantId_status_idx`

## 6. Invites pendentes por tenant

```sql
EXPLAIN ANALYZE
SELECT *
FROM invites
WHERE "tenantId" = $1
  AND status = 'PENDING'
ORDER BY id
LIMIT 100;
```

Índice esperado: `invites_tenantId_status_idx`

## 7. Audit trail por tenant + período

```sql
EXPLAIN ANALYZE
SELECT *
FROM audit_logs
WHERE "tenantId" = $1
  AND "createdAt" BETWEEN $2 AND $3
ORDER BY "createdAt" DESC
LIMIT 100;
```

Índice esperado: `audit_logs_tenantId_createdAt_idx`

## 8. Quotas por tenant + resource_type

```sql
EXPLAIN ANALYZE
SELECT *
FROM quota_usage
WHERE "tenantId" = $1
  AND "resourceType" = 'API_REQUESTS'
  AND period = $2;
```

Índice esperado: `quota_usage_tenantId_resourceType_period_key`

## 9. Sessions ativas por tenant

```sql
EXPLAIN ANALYZE
SELECT *
FROM sessions
WHERE "tenantId" = $1
  AND status = 'ACTIVE'
ORDER BY id
LIMIT 100;
```

Índice esperado: `sessions_tenantId_status_idx`

## 10. Organizations por tenant

```sql
EXPLAIN ANALYZE
SELECT *
FROM organizations
WHERE "tenantId" = $1;
```

Índice esperado: `organizations_tenantId_id_idx`

## Critério de aceite

- O plano final deve mostrar `Index Scan`, `Bitmap Index Scan` ou `Index Only Scan` nas consultas acima.
- Qualquer `Seq Scan` em tabelas críticas deve ser tratado como regressão antes do fechamento do ciclo.
