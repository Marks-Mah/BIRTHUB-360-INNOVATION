# Política de Criação de Índices (Index Creation Policy)

Este documento define os padrões, custos e procedimentos de aprovação para a criação de novos índices no banco de dados do BirthHub360. Como nosso modelo é *Multi-Tenant* via *Shared Schema*, índices eficientes são a base da escalabilidade, mas índices mal planejados geram custos insustentáveis de I/O de escrita e Storage.

## 1. Princípios Básicos (Quando Criar)

Índices NÃO são gratuitos. Cada índice em uma tabela retarda todas as operações de escrita (`INSERT`, `UPDATE`, `DELETE`) nessa tabela, pois a árvore B-Tree precisa ser mantida sincronizada. Apenas crie índices que justifiquem seu custo.

**Motivos Válidos para Criar um Índice:**
1.  **Filtros Críticos Constantes:** Colunas usadas na cláusula `WHERE` da grande maioria das consultas principais (ex: `tenant_id`, `status`, `user_id`).
2.  **Ordenação de Paginação:** Colunas frequentemente usadas em `ORDER BY` junto com paginação (`LIMIT`/`OFFSET` ou Cursors) (ex: `created_at`, `updated_at` combinados com `tenant_id`).
3.  **Junções Frequentes (JOINs):** Colunas usadas como *Foreign Keys* que sustentam integrações da API (ex: `JOIN profiles ON users.id = profiles.user_id`).
4.  **Agregações e Análises:** Índices com `INCLUDE` para evitar consultas ao *Heap* (Tabela Primária) quando calcular sumários (ex: `SUM(amount)`).
5.  **Unicidade:** Garantir regras de negócio (Índices Únicos), onde a aplicação não pode confiar em validação de software (ex: `UNIQUE(tenant_id, email)`).

**Quando NÃO Criar um Índice:**
1.  Buscas raras (ex: relatórios executados 1 vez ao mês que podem demorar alguns segundos).
2.  Tabelas minúsculas (menos de 500 registros, onde um *Sequential Scan* em memória RAM é mais rápido).
3.  Colunas com baixíssima cardinalidade e pouca variação, isoladamente (ex: um campo booleano `is_active` sozinho geralmente não ajuda sem `tenant_id` ou em tabelas em que 99% das linhas têm o mesmo valor).

## 2. A Regra de Ouro do Multi-Tenant (Prefixo de Tenant)

Toda tabela que contenha a coluna `tenant_id` deve incluí-la como o **primeiro campo** de praticamente todos os seus índices B-Tree compostos que suportem consultas filtradas (ex: `CREATE INDEX idx_name ON table_name (tenant_id, created_at DESC)`).

Isso garante que as partições lógicas de dados fiquem agrupadas no índice, maximizando o *Cache Hit Ratio* quando um cliente da API acessa intensivamente sua própria organização e que o RLS funcione sempre com *Index Scans*.

## 3. Custos de Indexação e Impacto no Banco

A criação e manutenção de índices causam impacto direto:

### Custos de Criação e Storage
1.  **Storage Extra:** Cada índice ocupa espaço em disco e, criticamente, memória RAM. Índices que não cabem na memória RAM (Memória *shared_buffers*) degradam massivamente a performance, pois causam leituras de disco no armazenamento NVMe.
2.  **Sobrecarga de WAL:** Alterações de dados geram logs WAL no PostgreSQL maiores por causa dos índices (Write Amplification).
3.  **Locks de Criação:** A criação padrão de índices (`CREATE INDEX`) aplica um bloqueio exclusivo de escrita (`ShareLock`) na tabela durante o processo.

### Procedimento de Criação Segura em Produção
*   **Sempre Use `CONCURRENTLY`:** Nenhuma migração que aplique índices em tabelas existentes com tráfego de produção deve usar a sintaxe bloqueante padrão. Todos os frameworks de ORM e SQL brutos devem usar `CREATE INDEX CONCURRENTLY`. Isso constrói o índice sem bloquear `INSERT/UPDATE/DELETE`. (Isso não se aplica dentro de blocos de transação de tabelas novas e vazias recém-criadas em uma mesma migration).

## 4. O Processo de Aprovação e Code Review

1.  **Justificativa Mínima no PR:** Todo *Pull Request* que adicione uma nova `Migration` contendo um índice em uma tabela existente DEVE vir acompanhado da análise do Plano de Execução (EXPLAIN) comprovando o benefício teórico (seja via staging ou via plano local num volume de dados sintético razoável).
2.  **Validação de Índices Ociosos (Unused Indexes):** Trimestralmente, o time de DBA ou DevOps revisará a tabela `pg_stat_user_indexes`. Índices grandes com `idx_scan` próximo a zero (ou seja, nunca usados pelo Query Planner) serão marcados para remoção, economizando custos.
3.  **Tamanho Limite do Índice:** Índices que exigem indexação de payloads (ex: campos `jsonb`, descrições longas) não devem usar B-Trees inteiras; devem usar GIN (com `jsonb_path_ops`) ou extensões otimizadas para evitar inchaço de bytes.

Qualquer violação deste processo de aprovação barrará o *Merge* da funcionalidade ou forçará um *Rollback* de emergência caso a criação bloqueante atinja a produção e degrade a capacidade de escrita.