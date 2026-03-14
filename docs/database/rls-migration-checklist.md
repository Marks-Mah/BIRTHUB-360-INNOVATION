# Checklist de Revisão de Migrations com RLS (Row-Level Security)

Este checklist DEVE ser preenchido por cada desenvolvedor e validado pelo Revisor de Código (Code Reviewer) em TODO Pull Request (PR) que crie uma nova tabela ou altere o relacionamento de dados multi-tenant no banco de dados principal do BirthHub360.

A omissão de políticas RLS corretas na criação de tabelas é a principal causa-raiz de incidentes de vazamento (Data Bleed) entre Tenants.

## Instruções para o Desenvolvedor
Copie o bloco de markdown abaixo e cole na descrição do seu Pull Request (PR) caso ele contenha arquivos de migração (ex: Prisma, Alembic, raw SQL).

---
## 🛡️ Revisão de Segurança: Migração Multi-Tenant (RLS)

**Tabela(s) Criada(s)/Afetada(s):** [Nomes_das_Tabelas]

**1. A tabela possui vínculo de Tenant?**
- [ ] SIM. Adicionei a coluna `tenant_id` (UUID ou formato padrão do sistema).
- [ ] NÃO. A tabela NÃO armazena dados de clientes finais (Ex: logs de sistema global, dicionários, filas globais). Li o documento `docs/database/rls-exemptions.md` e a isenção está justificada formalmente lá.

*(Se marcou NÃO e a tabela foi documentada, ignore os itens abaixo)*

**2. Omissão de Bypass (Row Level Security Ativado)?**
- [ ] Habilitei o RLS na tabela usando o comando:
  `ALTER TABLE [nome_da_tabela] ENABLE ROW LEVEL SECURITY;`
- [ ] Forçei a aplicação do RLS para o Dono (Owner), evitando bypass do próprio ORM/Migration script com:
  `ALTER TABLE [nome_da_tabela] FORCE ROW LEVEL SECURITY;`

**3. Criação de Políticas de Segurança (Policies)?**
- [ ] Criei a política de RLS vinculada à variável de sessão da API. Exemplo (ou equivalente do seu framework/ORM):
  ```sql
  CREATE POLICY tenant_isolation_policy ON [nome_da_tabela]
  AS PERMISSIVE FOR ALL
  TO public
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
  ```
- [ ] Entendo que os comandos USING (leitura/deleção) e WITH CHECK (inserção/atualização) foram validados, evitando que a aplicação escreva ou leia dados em um `tenant_id` diferente da sessão autenticada.

**4. Performance: Índice de Primeira Coluna?**
- [ ] Adicionei um índice B-Tree (ex: `CREATE INDEX`) na tabela onde o `tenant_id` é a PRIMEIRA coluna do índice, para garantir que as buscas de escopo limitadas pelo RLS usem o índice e não causem *Sequential Scans*. Exemplo:
  `CREATE INDEX idx_[tabela]_tenant_id ON [nome_da_tabela](tenant_id);`

**5. Rollback (Opcional, mas Recomendado)?**
- [ ] Escrevi o código `DOWN` (rollback) da migration de forma segura, removendo a política RLS (DROP POLICY) antes ou junto com a exclusão da tabela (DROP TABLE).
---

## Instruções para o Revisor de Código (Reviewer)

O seu papel como Revisor é a última barreira antes de um incidente de segurança em Produção. Se qualquer item do checklist acima estiver desmarcado ou incorreto (ex: um script de migration SQL cria a tabela mas esquece de incluir o `ALTER TABLE ENABLE ROW LEVEL SECURITY`), **você deve bloquear o PR imediatamente (Request Changes)**.
