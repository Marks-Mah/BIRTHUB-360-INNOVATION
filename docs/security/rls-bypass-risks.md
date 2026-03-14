# Análise de Risco: Bypass de RLS (Super-User e Conexões de Migração)

Este documento analisa os riscos de segurança associados ao contorno (bypass) inadvertido ou malicioso das políticas de Row-Level Security (RLS) no PostgreSQL, que garante o isolamento Multi-Tenant do BirthHub360.

O RLS é extremamente poderoso, mas não se aplica a todas as conexões ou papéis (roles) do banco de dados por padrão.

## 1. O Risco do Papel de Super-User (postgres) e BYPASSRLS

O PostgreSQL define que papéis com o atributo `SUPERUSER` ou `BYPASSRLS` **ignoram totalmente** as políticas RLS configuradas em qualquer tabela, como se elas não existissem. O bypass de RLS é o maior vetor de falha de isolamento em uma arquitetura Multi-Tenant com Shared Schema.

### Cenários de Risco Crítico
1.  **Vazamento por Configuração Errada do Pooler:** A aplicação web (API) é configurada para conectar-se ao banco de dados usando a conta `postgres` (o super-usuário padrão) em vez de uma conta restrita (ex: `api_worker`). O RLS não atua e queries sem `WHERE tenant_id` retornam ou alteram dados de todos os clientes globais.
2.  **Jobs de Manutenção / Cron:** Um script agendado roda como superusuário para recalcular faturas e acidentalmente atualiza todas as tabelas, afetando dezenas de clientes sem o filtro de segurança invisível (RLS) que salvaria a operação.
3.  **Desenvolvedor Acessando Prod:** Um desenvolvedor conecta-se com sua role de administração para investigar um bug em um cliente (Tenant A) e acidentalmente envia um `DELETE FROM orders WHERE id=123`. A ordem deletada, que era do Tenant B, é perdida.

## 2. O Risco em Conexões de Migração (Schema Owner)

No PostgreSQL, o **dono da tabela (Table Owner)** geralmente ignora o RLS da sua própria tabela (a menos que a tabela seja explicitamente forçada com `ALTER TABLE my_table FORCE ROW LEVEL SECURITY`). O dono também costuma ser a role usada para rodar migrações (Prisma/Alembic/Flyway).

### Cenários de Risco com Migrações
1.  **Migração de Dados Misto (Data Migration):** Um desenvolvedor cria uma *migration* para popular um novo campo em uma tabela existente com base em uma lógica complexa (UPDATE). A migração roda como dono (Owner) e modifica as linhas globalmente sem testar o tenant.
2.  **Ferramentas de ORM Ignorando o FORCE RLS:** Se a API se conectar com o papel do Dono do Schema, ela mesma vai ignorar o RLS e vazar dados (a menos que `FORCE ROW LEVEL SECURITY` tenha sido ativado rigorosamente em todas as tabelas criadas).

## 3. Mitigações e Boas Práticas (Regras Operacionais)

As seguintes regras devem ser rigorosamente aplicadas à infraestrutura do BirthHub360:

### 3.1. Roles Dedicadas e Princípio do Menor Privilégio (Least Privilege)
NUNCA use contas de Superusuário ou Dono (Owner) para conexões de Aplicação (API/Workers).
Crie roles estritas, por exemplo:
*   `db_owner` (Usado SOMENTE para rodar Migrations/DDL). Atributo: `NOBYPASSRLS` em tabelas forçadas ou `BYPASSRLS` estritamente controlado.
*   `api_worker` (Usado pela API Web e Workers de Fila). Atributo: `NOBYPASSRLS`. Só pode ler e escrever dados nas tabelas concedidas, estando submisso ao RLS sempre.
*   `readonly_analyst` (Usado para BI/Dashboards globais ou Dashboards de Tenant). Atributo: `NOBYPASSRLS` se atrelado a tenant, e deve ter a variável de tenant forçada no início da sessão ou bloqueada.

### 3.2. FORCE ROW LEVEL SECURITY (Recomendado)
Para evitar que até mesmo o Table Owner (e por extensão, a role que cria a tabela) contorne acidentalmente o RLS (como em consultas `SELECT` rodadas pelo próprio ORM de migração), sempre execute:
```sql
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE my_table FORCE ROW LEVEL SECURITY;
```
Isso força o dono a seguir as regras, a menos que ele explicitamente declare `BYPASSRLS` no nível da conexão ou transação.

### 3.3. Configuração de Variáveis de Conexão no Pooler (PgBouncer)
Garanta que, quando a API inicializar um request, a primeira instrução `set_config('app.tenant_id', 'id_do_jwt', false)` não consiga ser adulterada globalmente por um atacante injetando comandos em um campo de formulário. As conexões que limpam a sessão (como `DISCARD ALL` ou poolers no modo Transaction) garantem que a sessão seguinte não herde a elevação de privilégio deixada por um bypass de migração ou tenant anterior.

### 3.4. Auditoria Contínua de Roles (DBA)
Sistemas de monitoramento (como Datadog ou AWS GuardDuty/CloudWatch) ou jobs diários devem alertar caso qualquer conexão seja feita à base de dados primária usando uma role com atributos super-administrativos (`SUPERUSER`, `CREATEROLE`, `CREATEDB`, `BYPASSRLS`) que não seja oriunda da ferramenta oficial de Migração de CD (Continuous Deployment) nos IPs aprovados. Se a API logar como "postgres", um alarme crítico (`SEV-1`) deve ser acionado e as conexões cortadas automaticamente no firewall (WAF/Security Groups).