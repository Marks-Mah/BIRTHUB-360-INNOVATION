# Checklist de Validação Pós-Migração de Dados (Post-Migration Validation)

Imediatamente após a conclusão da janela de manutenção do "Cut-over" (Fase 3 do ADR-009) e ANTES de religar o sistema (API Gateway) para o tráfego público, o Engenheiro DBA (Database Administrator) ou SRE Responsável deve executar os scripts de validação abaixo para garantir que o banco de dados está íntegro e em conformidade com o modelo Multi-Tenant.

## 1. Integridade de Schema e Constraints

- [ ] **NOT NULL Check:** Todas as tabelas Multi-Tenant (ex: `users`, `orders`, `patients`, `invoices`) tiveram a coluna `tenant_id` alterada para `NOT NULL` com sucesso?
  *(Se alguma linha ficou com NULL, a tabela não aceitará a constraint e apontará erro de dados órfãos).*
- [ ] **Foreign Keys Ativas:** O relacionamento entre tabelas filhas e `organizations` está com `ON DELETE CASCADE` configurado corretamente para permitir a purga de tenants no futuro?
- [ ] **Índices Criados:** Os índices compostos que lideram com `tenant_id` foram criados e seus tamanhos estão compatíveis com o número de linhas? (`SELECT indexname FROM pg_indexes WHERE indexdef LIKE '%tenant_id%';`)

## 2. Validação de Isolamento (RLS Enforcement)

- [ ] **RLS Enabled:** Rodou a query para confirmar que `rowsecurity = true` em todas as tabelas-alvo em `pg_tables`?
  `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
- [ ] **Force RLS Ativado:** Rodou a query para garantir que `forcerowsecurity = true` (prevenindo bypass do Owner)?
  `SELECT relname, relforcerowsecurity FROM pg_class WHERE relname IN ('table_a', 'table_b');`
- [ ] **Teste Seco (Dry Run RLS):** O DBA deve abrir uma transação restrita, definir um `tenant_id` arbitrário (`set_config('app.tenant_id', 'id_x', false)`) e tentar rodar `SELECT count(*) FROM orders`. O retorno deve ser SOMENTE o número de linhas do Tenant X (e não o total do banco).

## 3. Integridade de Dados (Data Auditing)

- [ ] **Contagem de Linhas (Row Count Parity):** A soma das linhas de todas as tabelas ANTES da migração (Snaphost de T-1) bate EXATAMENTE com a soma das linhas DEPOIS da migração? (Para assegurar que o RLS e constraints não apagaram ou bloquearam dados acidentalmente).
- [ ] **Sem Dados Órfãos ("Orphan Check"):** Executou uma busca verificando se existe algum registro amarrado a um `tenant_id` que **não existe** na tabela primária `organizations`?
  *(A verificação de integridade referencial do Postgres (FK) deve barrar isso, mas uma conferência é exigida).*
- [ ] **Poluição Inter-Tenant (Cross-linking):** Rodou o script de validação de junções (JOINs) que prova que, se a Linha A na Tabela 1 está atrelada à Linha B na Tabela 2, AMBAS possuem o mesmíssimo `tenant_id`? (Evitando que a fatura do Tenant A aponte para um paciente do Tenant B).

## 4. Performance Inicial (Index Warm-up)

- [ ] **Analyze (Atualizar Estatísticas):** Após o Cut-over, o Postgres precisa saber a nova distribuição de dados (agora com `tenant_id`). Executou o comando `ANALYZE;` global ou nas tabelas principais para recriar os metadados do Query Planner?
- [ ] **Teste de Consulta Pesada:** Uma consulta E2E de simulação (Listagem de faturas, por exemplo) foi disparada, e o `EXPLAIN` confirmou que ela usa o *Index Scan* (aproveitando o `tenant_id`) e **NÃO** usa *Sequential Scan*?

## 5. Auditoria de Rollback

- [ ] **Snapshot Intacto:** Confirma que o Snapshot (Snapshot Manual do AWS RDS) ou Backup Lógico completo gerado *antes* do início da Janela de Manutenção está salvo e acessível no S3, protegido contra exclusão, caso este checklist falhe e o plano de Rollback (RTO < 15 min) precise ser invocado?

*(Assinatura do DBA/SRE responsável pela aprovação antes do religamento da API)*