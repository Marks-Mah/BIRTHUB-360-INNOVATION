# ADR-008: Row-Level Security (RLS) como Segunda Camada de Defesa (Defense in Depth)

## Status
Accepted

## Contexto
O BirthHub360 utiliza o PostgreSQL com um modelo de *Shared Schema*, onde múltiplas organizações armazenam seus dados nas mesmas tabelas. Para garantir o isolamento (Tenant Isolation), decidimos adotar o Row-Level Security (RLS) nativo do PostgreSQL (ver ADR-007).

A discussão atual é sobre a **confiabilidade do RLS**. Devemos confiar *exclusivamente* no RLS do banco de dados para garantir a segurança, ou o RLS deve ser tratado apenas como uma segunda camada (Safety Net)?

## Decisão
**O RLS será estritamente implementado como a SEGUNDA camada de defesa (Safety Net). A aplicação (Camada de Serviço/API) continua sendo a PRIMEIRA e principal responsável pela autorização e isolamento de dados.**

Isso significa que o código da aplicação *deve* sempre incluir explicitamente o `tenant_id` em suas queries e validações (ORM/Query Builders), enquanto o banco de dados atua como um "cinto de segurança" silencioso que impede vazamentos caso o desenvolvedor esqueça a cláusula `WHERE` na aplicação.

## Raciocínio (Por que não confiar apenas no RLS)

1.  **Exceções e Conexões Globais (Bypass):** Certas tarefas (Migrations, Scripts de manutenção, Workers de sincronização global) conectam-se usando contas com privilégios de `BYPASSRLS` ou `SUPERUSER`. Se uma dessas rotinas tiver um bug de injeção ou lógica falha, o banco de dados não bloqueará o acesso indevido.
2.  **Degradação Silenciosa e Contexto Perdido:** O RLS funciona lendo variáveis de sessão (ex: `current_setting('app.tenant_id')`). Se um connection pooler (como PgBouncer no modo Transaction) ou um middleware falhar ao resetar essa variável antes de repassar a conexão para o próximo request, o RLS assumirá a identidade de um Tenant A vazando os dados para o Tenant B de forma silenciosa e "autorizada" pelo banco. A aplicação repassando o ID explicitamente mitiga esse reuso de estado de conexão.
3.  **Performance (Planos de Execução):** Quando a aplicação inclui explicitamente `WHERE tenant_id = 'XYZ'` nas queries enviadas, o otimizador do PostgreSQL (Query Planner) tem mais facilidade para avaliar a seletividade e usar *Index Scans* logo na fase de *Parse*. Depender exclusivamente do *Policy Injector* interno do RLS (fase de *Rewrite*) às vezes leva a escolhas de planos sub-ótimos em joins muito complexos (Nested Loops ineficientes).
4.  **Erros Verbosos da API:** O RLS puro, ao bloquear o acesso a um registro, simplesmente filtra e não o retorna. Isso transforma um erro 403 (Forbidden - O usuário tentou acessar um ID de outro tenant) em um 404 (Not Found). Em certos fluxos de auditoria, a aplicação precisa saber se o recurso existe e a quem pertence para logar uma tentativa de quebra de segurança.

## Consequências e Implementação

1.  **Regra do Duplo Filtro:** Todo repositório de dados/ORM *deve* incluir `where(tenant_id=context.tenant_id)` nas buscas de clientes (Primeira Camada).
2.  **Middlewares de Conexão:** O sistema de banco de dados *deve* definir `set_config('app.tenant_id', ...)` no início de cada transação web (Segunda Camada - RLS).
3.  **Proibição de Bypass Implícito:** A API pública não pode, sob nenhuma circunstância, usar roles de banco de dados que contenham o atributo `BYPASSRLS`. A role do pool de conexões da API (`api_worker`) deve ser submissa às regras RLS (Role com atributo `NOBYPASSRLS`).
4.  **Auditoria Constante:** Ferramentas de CI devem verificar a existência de testes de integração que forcemos a quebra do filtro da aplicação para provar que o RLS está de pé interceptando o vazamento (Security Chaos Testing).