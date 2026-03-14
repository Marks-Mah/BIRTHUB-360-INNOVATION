# Análise de Plano de Execução (Query Execution Plans) e Validação de Indexes

Nossa arquitetura multi-tenant baseada em "Shared Schema com RLS" introduz desafios específicos para o otimizador de consultas (Query Planner) do PostgreSQL. Este documento aborda os padrões de plano de execução (EXPLAIN ANALYZE) para as consultas críticas e define as expectativas de uso correto de indexes.

## 1. O Problema do RLS nos Planos de Execução

Quando uma política RLS (Row-Level Security) está ativa, o PostgreSQL automaticamente injeta o predicado do tenant (ex: `tenant_id = current_setting('app.current_tenant_id')`) na cláusula `WHERE` da consulta sob os panos.

*   **Risco (Seq Scan):** Se a tabela não tiver um índice composto apropriado, o otimizador pode escolher um Sequential Scan (Varredura Sequencial), lendo dados de *todos os tenants* e filtrando linha a linha, o que devasta a performance em tabelas grandes.
*   **A Abordagem Correta (Index Scan/Bitmap Index Scan):** A cláusula de RLS *deve* participar de um índice (Index Scan), permitindo que a busca pule diretamente para as páginas de disco que pertencem àquele tenant específico.

## 2. Queries Críticas Analisadas

Foram identificadas três operações críticas como base para análise e otimização:

### 2.1 Listagem de Recurso com Paginação (ex: Orders / Invoices)

**Query Típica:**
```sql
SELECT * FROM orders
WHERE status = 'PAID'
ORDER BY created_at DESC
LIMIT 50 OFFSET 100;
```
**Plano Esperado sem RLS:**
Busca usando índice em `(status, created_at)`.

**Plano Esperado com RLS (Realidade Multi-Tenant):**
A query oculta é: `SELECT * FROM orders WHERE tenant_id = 'T_ABC' AND status = 'PAID' ORDER BY created_at DESC LIMIT 50 OFFSET 100`.
O banco deve executar um **Index Scan** no índice composto:
`CREATE INDEX idx_orders_tenant_status_created_at ON orders (tenant_id, status, created_at);`
*Análise:* O Planner filtra os registros exatamente para a partição lógica do tenant, aplica a segunda condição de filtro (`status`) e ordena (`created_at`) utilizando os ponteiros da árvore do índice.

### 2.2 Agregação/Dashboard (ex: Total Revenue por Mês)

**Query Típica:**
```sql
SELECT date_trunc('month', created_at) as month, SUM(amount)
FROM invoices
WHERE created_at > '2023-01-01'
GROUP BY month;
```
**Plano Esperado com RLS:**
A query oculta adiciona `AND tenant_id = 'T_ABC'`.
Para não escanear a tabela inteira, o banco deve fazer um **Index Only Scan** ou **Bitmap Heap Scan** usando:
`CREATE INDEX idx_invoices_tenant_created_amount ON invoices(tenant_id, created_at) INCLUDE (amount);`
*Análise:* O Planner usa o índice para localizar a faixa de datas restrita ao tenant. O `INCLUDE(amount)` evita leituras de heap (tabela principal), acelerando a agregação de somatório.

### 2.3 Junção (JOIN) entre Recursos (ex: User e Profile)

**Query Típica:**
```sql
SELECT u.email, p.full_name
FROM users u
JOIN profiles p ON u.id = p.user_id;
```
**Plano Esperado com RLS:**
A condição RLS (`p.tenant_id = 'T_ABC' AND u.tenant_id = 'T_ABC'`) é aplicada em ambas as tabelas.
Índices recomendados:
`CREATE INDEX idx_users_tenant_id ON users (tenant_id);`
`CREATE INDEX idx_profiles_tenant_user_id ON profiles (tenant_id, user_id);`
*Análise:* O Planner deve preferir um **Nested Loop Join** (para tenants com poucos dados) ou **Hash Join** limitando a construção do Hash Table estritamente aos registros filtrados do tenant.

## 3. Validação de Indexes em CI/CD e PRs

*   **Padrão Prefixado:** A primeira regra para toda tabela multi-tenant é: **Todos os índices B-Tree que filtram buscas devem ter `tenant_id` como sua primeira coluna principal.** (ex: `(tenant_id, column_a, column_b)` em vez de `(column_a, tenant_id)`). Isso garante seletividade máxima imediata.
*   **Verificação de Planos:** Durante o desenvolvimento (Local/Staging), os desenvolvedores devem usar a extensão `auto_explain` ou rodar `EXPLAIN ANALYZE` garantindo que o plano não mostre `Filter: (tenant_id = ...)` dentro de um `Seq Scan`. A visualização deve mostrar `Index Cond: (tenant_id = ...)`.