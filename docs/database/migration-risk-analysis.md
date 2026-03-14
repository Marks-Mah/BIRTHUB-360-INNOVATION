# Análise de Risco de Migração (Migration Risk Analysis)

Este documento detalha os potenciais riscos à integridade dos dados e à estabilidade da aplicação inerentes ao processo de migração de um banco de dados legado genérico para o modelo Multi-Tenant com RLS (Row-Level Security) do BirthHub360.

O processo de migração (descrito na ADR-009) altera a estrutura fundamental (DDL) e as regras de acesso (DCL/Policies). Um erro neste processo pode ser irreversível sem a atuação de um plano de Rollback rápido.

## 1. Dados Órfãos e Perda de Contexto (Orphaned Data)

**O Cenário de Risco:**
O banco antigo tem a tabela `orders` que não exigia obrigatoriamente um dono (`user_id` nullable), ou o usuário original daquela ordem já foi deletado (Soft Delete sem cascata no legado).
Quando o script de migração do "Fase 2: Backfill" (Ver ADR-009) tentar encontrar o `tenant_id` dessa ordem olhando para a tabela de usuários, ele retornará nulo ou erro.

*   **Impacto (Alto):** Quando a migração executar o passo `ALTER TABLE orders ALTER COLUMN tenant_id SET NOT NULL`, a instrução falhará (Exception) porque há registros órfãos com valor nulo. A migração aborta, causando tempo de inatividade prolongado. Se o desenvolvedor tentar contornar isso setando um `tenant_id` padrão (ex: `00000000-0000-0000-0000-000000000000`), a API nova tentará ler e o RLS bloqueará, efetivamente "apagando" o dado (Invisibilidade de Dados).
*   **Mitigação:**
    *   **Auditoria Pré-Migração (Dry Run):** Rodar scripts de Data Quality semanas antes do Cut-over para listar todos os IDs que falharão no join de parentesco (`SELECT id FROM orders WHERE user_id IS NULL OR user_id NOT IN (SELECT id FROM users)`).
    *   **Resolução Manual/Descarte:** A equipe de produto deve decidir o que fazer com dados órfãos antes da migração (Ex: Apagar definitivamente via Hard Delete ou amarrá-los a um Tenant de Arquivo/Administrativo). A migração *nunca* deve inventar donos para as linhas.

## 2. Conflito de Chaves Estrangeiras (Foreign Key Violation)

**O Cenário de Risco:**
A arquitetura Multi-Tenant isolada exige que relacionamentos entre tabelas (JOINs) não atravessem as fronteiras dos tenants (ex: O *Médico X* do Tenant A não pode ser associado à *Consulta Y* do Tenant B).

*   **Impacto (Médio/Alto):** No banco legado (sem RLS e sem amarras fortes), pode ter ocorrido uma falha na API que permitiu a criação acidental de um vínculo de terceiros. Durante o Cut-over, se adicionarmos constraints do tipo `CHECK (parent.tenant_id = child.tenant_id)` ou tentarmos atualizar o tenant de forma imperativa (em lote), o banco apontará inconsistência relacional (Constraint Violation).
*   **Mitigação:**
    *   O script de Backfill deve ser *Top-Down* (Root-to-Leaves). O Tenant da organização "contamina" o usuário, que contamina os pacientes, que contamina as consultas, etc.
    *   Consultas anômalas (Cross-Tenant FKs no legado) detectadas no Dry Run devem ser desfeitas e tratadas pela equipe de suporte como "Incidentes de Data Bleed Antigos", isolando os registros afetados.

## 3. RLS Quebrado (Broken RLS Policies)

**O Cenário de Risco:**
A política de segurança (Policy) do PostgreSQL usa a instrução `USING (tenant_id = current_setting('app.tenant_id')::uuid)`. Durante a migração, o desenvolvedor escreve a policy com um erro de sintaxe, aponta para a variável errada (ex: `app.org_id`), ou falha em aplicar a instrução `FORCE ROW LEVEL SECURITY`.

*   **Impacto (Catastrófico - Efeito Sandboxing Bloqueante ou Bypass):**
    *   *Cenário A (Default Deny):* O RLS falha ao ler a sessão, assume `NULL` ou dá exceção. A API tenta listar usuários e o banco responde `0 rows`. O sistema entra no ar, mas nenhum cliente consegue ver seus próprios dados. O suporte entra em colapso com milhares de chamados de "Meus dados sumiram".
    *   *Cenário B (Default Allow/Bypass):* A policy não é forçada (`FORCE ROW LEVEL SECURITY`) e o sistema acessa como Owner do banco, ou uma falha de ORM envia transações sem o Header do Tenant e a policy permite a leitura livre. Resultado: Na segunda-feira pela manhã, o Hospital A vê as faturas do Hospital B. (Incidente Reportável na LGPD).
*   **Mitigação:**
    *   **Checklist e Pareamento Rigoroso:** Obrigatoriedade do preenchimento da `docs/database/rls-migration-checklist.md` por dois engenheiros sêniores diferentes.
    *   **Provas de Isolamento (Smoke Testing no Cut-over):** O ambiente não pode ser reaberto ao público sem que o QA/Automação rode a suíte completa de `verify-tenant-isolation.sh` no próprio banco recém-migrado, na janela de manutenção. O script de Rollback é invocado imediatamente se falhar um único teste.

## 4. Timeout de Locks em Tabelas de Gigabytes (Downtime Estendido)

**O Cenário de Risco:**
Para tabelas com 500 milhões de registros (ex: `logs`, `events`), comandos como `ALTER TABLE ADD COLUMN tenant_id` ou `CREATE INDEX` (se executado sem `CONCURRENTLY`) travam (Exclusive Lock) a tabela inteira por dezenas de minutos ou horas, estourando a Janela de Manutenção.

*   **Impacto (Alto):** Falha no cumprimento do RTO, penalidades contratuais de SLA por indisponibilidade sistêmica.
*   **Mitigação:** A fase 1 (Criação da coluna NULL) e a Criação do Índice (usando `CONCURRENTLY`) DEVE acontecer *semanas antes* da janela de manutenção, a quente, sem afetar o tráfego. Na janela de manutenção (Fase 3) fica apenas o preenchimento de deltas pequenos e a criação da Policy de Segurança, que é instantânea (Metadata update). A instrução `NOT NULL` sobre milhões de linhas tem um peso transacional, que pode exigir táticas avançadas como particionamento.