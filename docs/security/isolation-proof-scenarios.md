# Prova Formal de Isolamento (Isolation Proof Scenarios)

Este documento documenta os cenários de testes focados em vazamento de dados entre Tenants (Cross-Tenant Leakage) e a validação do Row-Level Security (RLS). Estes cenários devem ser transformados em testes automatizados na nossa Isolation Suite, sendo obrigatoriamente aprovados em cada novo deploy.

## Cenários de Isolamento (Camadas API / RLS / Queue / Cache)

### 1. Acesso Direto de Leitura (IDOR via API)
**Ação:** Usuário Autenticado do `Tenant_A` realiza um GET direto à URL de um Recurso que pertence exclusivamente ao `Tenant_B` (`GET /api/orders/id_b`).
**Resultado Esperado:** O sistema deve retornar **HTTP 404 Not Found** (como se o recurso não existisse, não expondo 403) ou **HTTP 403 Forbidden** se o ID for globalmente o mesmo por design e RLS bloquear o acesso da linha. Nenhum byte do `Tenant_B` deve ser devolvido.

### 2. Acesso Direto de Escrita (IDOR via API - Update)
**Ação:** Usuário do `Tenant_A` envia um PUT com payload malicioso apontando para o ID de um objeto do `Tenant_B` (`PUT /api/orders/id_b`).
**Resultado Esperado:** A tentativa de atualização falha (Zero linhas afetadas / Retorno 404). O RLS bloqueia o `UPDATE` porque a política só permite modificações onde `tenant_id = current_setting('app.tenant_id')`.

### 3. Exclusão Indevida (IDOR via API - Delete)
**Ação:** Usuário do `Tenant_A` envia uma requisição `DELETE /api/users/user_b`.
**Resultado Esperado:** Operação falha (HTTP 404) e log de segurança gerado apontando uma tentativa de quebra de limite (Bound Violation). RLS impede que a linha do banco de dados seja apagada.

### 4. Enumeração Global (Lista Seca - GET All)
**Ação:** Um atacante interno com o Token do `Tenant_A` tenta listar todos os usuários batendo no endpoint não paginado `GET /api/users`.
**Resultado Esperado:** O resultado (Body JSON) só retorna os arrays de entidades pertencentes única e exclusivamente ao `Tenant_A`. O banco de dados cortou a leitura dos demais tenants via RLS `SELECT` policy.

### 5. Filtragem "Sujo" (Query Parameter Injections)
**Ação:** Usuário do `Tenant_A` tenta sobrescrever o contexto da API injetando `?tenant_id=Tenant_B` ou via manipulação de form-data na URL.
**Resultado Esperado:** O sistema ignora os parâmetros injetados e baseia o `tenant_id` sempre e somente no Token (JWT Claim criptografado) e restringe ao contexto da sessão. A injeção na URL não surte efeito.

### 6. Contaminação por Relacionamentos (JOINs Indevidos - Cross-Tenant FK)
**Ação:** Usuário do `Tenant_A` tenta criar uma Nova Fatura (Invoice) preenchendo o `customer_id` com o UUID de um Cliente (Customer) pertencente ao `Tenant_B`.
**Resultado Esperado:** Erro na criação (Constraint Violation ou 404 no Lookup). O banco não permite inserir registros no `Tenant_A` que referenciam chaves estrangeiras que só existem no escopo de RLS do `Tenant_B`.

### 7. Vazamento por Auto-Increment e Timing
**Ação:** Atacante em `Tenant_A` mede os tempos de resposta da API para IDs numéricos (se existirem) sequenciais de faturas, identificando quais faturas retornam 403 e quais retornam 404 verdadeiro, vazando se o ID pertence a alguém ou nunca foi gerado.
**Resultado Esperado:** Como UUIDs v4 são os únicos expostos na API, e o retorno é unificado para 404 de forma constante (Constant-Time), o tempo não sofre anomalias e nenhuma métrica da infra de `Tenant_B` vaza.

### 8. Fila de Processamento Asíncrono (Queue Bleed)
**Ação:** Um Job agendado dispara um Webhook para `Tenant_B`, mas durante a extração do payload, o *worker* mantém o estado (Connection Context) do Webhook disparado segundos antes para o `Tenant_A`.
**Resultado Esperado:** O Webhook falha ou reverte imediatamente porque o sistema exige a injeção do cabeçalho explícito de contexto no início de *cada nova transação do Worker* e reinicia a variável `current_setting('app.tenant_id')`.

### 9. Vazamento de Cache (Key Collisions)
**Ação:** Usuário logado em `Tenant_A` com perfil `ID=10` e Usuário em `Tenant_B` logado com perfil `ID=10`. Ambos consultam `GET /api/profile`.
**Resultado Esperado:** O Redis/Cache *deve* pre-fixar suas chaves. Se não houver prefixo (`profile:10`), o Usuário B veria os dados cacheados pelo Usuário A. O sistema deve provar via script que a chave de cache é estruturada em blocos `tenant:id:profile:id`.

### 10. Elevação de Privilégios Dentro do Próprio Tenant
**Ação:** Um usuário comum (Viewer) tenta promover-se a Administrador de `Tenant_A`.
**Resultado Esperado:** Não há impacto *Cross-Tenant*, mas o RLS de Update exige o perfil (Claim) `role = admin` atrelado ao próprio `tenant_id`. Barrado com HTTP 403.

### 11. Vazamento Massivo de Relatórios (Batch Export)
**Ação:** Exportação de CSV requisitada pelo Admin do `Tenant_A` é iniciada.
**Resultado Esperado:** A query principal de geração da Exportação obrigatoriamente herda a policy RLS (não roda como script genérico bypass) e o resultado armazenado num bucket S3 temporário possui ACL (Access Control List) específica do usuário requerente de `Tenant_A`.

### 12. Busca Complexa Full-Text Search (FTS)
**Ação:** Busca Elastic/Postgres (FTS) feita por `Tenant_A` por um nome ou CPF/CNPJ que só existe nos dados de `Tenant_B`.
**Resultado Esperado:** O índice Full-Text também respeita as amarras lógicas e não retorna nenhum hit (match count = 0), prevenindo Enumeração e Descoberta Oculta.

### 13. Exclusão em Massa Simulada
**Ação:** Job de Purge roda contra o `Tenant_A` usando uma API de Sistema. O job tenta apagar tudo de forma irrestrita `DELETE FROM orders`.
**Resultado Esperado:** O job rodando na conexão da API e com o contexto setado para `Tenant_A` será amparado pelo RLS e *somente* as `orders` do `Tenant_A` serão destruídas. As ordens do `Tenant_B` continuam intactas (Zero Impact Radius).

### 14. Relatórios de Auditoria (Logs Data Bleed)
**Ação:** O Administrador do `Tenant_A` acessa o painel de Audit Logs da organização.
**Resultado Esperado:** O retorno JSON dos logs não exibe nenhum log contendo e-mails, acessos, ou alterações originadas e assinadas pelo `Tenant_B`. A tabela global de Logs obedece RLS rígido.

### 15. Acesso com Conexão Nova (Sem Contexto RLS Definido)
**Ação:** Um *bug* no middleware esquece de configurar o `current_setting('app.tenant_id')` antes de executar a query de listagem `SELECT * FROM invoices`.
**Resultado Esperado:** Em tabelas Multi-Tenant, a política RLS padrão é definida como estrita (Default Deny). Sem a variável definida no banco ou com a variável nula, a política bloqueia a leitura (retorna 0 rows) em vez de retornar todos os registros de todos os tenants (Fail-Safe Default).
