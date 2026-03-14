# Tabelas Isentas de Row-Level Security (RLS)

O padrão arquitetural do BirthHub360 exige que **todas as tabelas do banco de dados relacional (PostgreSQL) que contenham dados de clientes (Tenant Data) tenham o RLS ativado**.

No entanto, o uso indiscriminado de RLS pode causar gargalos de performance, problemas de modelagem ou quebrar lógicas de sistema global. Este documento elenca as **exceções formalmente justificadas** onde o RLS *NÃO* é aplicado ou foi substituído por validações na camada de aplicação.

## 1. Regra Geral de Isenção

Uma tabela pode ser isenta de RLS apenas se atender a **todos** os seguintes critérios:
1.  Não armazena dados gerados, operados ou pertencentes a um ou mais clientes finais (Tenants).
2.  É acessada apenas por lógicas de sistema global, autenticação pré-login, faturamento da própria empresa dona do software, ou dicionários estáticos.
3.  Foi aprovada e documentada neste arquivo (via PR Code Review).

## 2. Tabelas Isentas (Whitelist)

Abaixo a lista oficial de tabelas que atualmente operam sem políticas RLS no schema público:

### 2.1. Tabelas de Autenticação e Identity Global
*   **Tabela:** `users` (ou tabela primária de contas/logins unificados se o sistema permitir um usuário pertencer a múltiplos tenants com o mesmo e-mail).
    *   **Justificativa Formal:** O endpoint de Login (`POST /api/auth/login`) precisa buscar o hash da senha do usuário pelo e-mail *antes* de saber qual é o `tenant_id` atual (pois o usuário pode ter mais de um ou o tenant é descoberto após o login). Aplicar RLS impediria a etapa de autenticação de inicializar o contexto do token.
*   **Tabela:** `refresh_tokens` ou `sessions`.
    *   **Justificativa Formal:** Semelhante à tabela `users`, a validação do token de renovação global (refresh token) ocorre antes de o contexto do tenant da requisição ser montado.

### 2.2. Tabelas de Sistema e Metadados Globais
*   **Tabela:** `tenants` (ou `organizations`).
    *   **Justificativa Formal:** É a tabela raiz. O provisionamento de novos tenants, o billing global do BirthHub360 e o roteamento de domínios customizados precisam ler essa tabela para mapear a qual `tenant_id` a requisição pertence. O RLS seria um paradoxo (preciso do tenant_id para ler o tenant_id). A proteção dessa tabela é feita estritamente no nível da API (Controllers).
*   **Tabela:** `plans`, `features`, `subscription_tiers`.
    *   **Justificativa Formal:** Tabelas de dicionário/domínio. Seus dados são idênticos, globais e estáticos (Somente-Leitura) para todos os clientes da plataforma. Não há risco de vazamento "cross-tenant" de dados de planos de assinatura.

### 2.3. Tabelas de Roteamento e Fila Global (Job Queue)
*   **Tabela:** `background_jobs` ou `event_queue` (Se usar pg-boss ou processamento assíncrono baseado no PG).
    *   **Justificativa Formal:** O Worker principal (Orquestrador) inicializa sem contexto de tenant e lê (Polling) as próximas mensagens da fila. O orquestrador precisa ver a fila de *todos* os tenants. O *Worker* em si, ao extrair o job, estabelece o `tenant_id` no banco antes de rodar o código do job (onde o RLS volta a atuar nas outras tabelas).

### 2.4. Auditoria de Sistema (Em Schema Separado)
*   **Tabela:** `audit.global_logs` (ou similar).
    *   **Justificativa Formal:** Se os logs de segurança e auditoria (ex: falhas de login, ataques de brute force) ocorrerem antes de o tenant ser identificado ou forem globais para a plataforma, eles residem em um schema separado (`audit`) acessível apenas por roles de administração e serviços de ingestão de logs (ex: Fluentd/Logstash), isolados do tráfego web multi-tenant diário.

## 3. Como Solicitar Isenção de RLS

Se um desenvolvedor criar uma nova tabela que se encaixa nos critérios de isenção, o processo é:
1.  **Não adicionar a instrução** `ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;` na *migration*.
2.  **Adicionar a tabela** a este documento (`docs/database/rls-exemptions.md`), sob a seção 2, incluindo o nome da tabela e a **Justificativa Formal**.
3.  **Aprovação:** O PR correspondente deve ser revisado e aprovado por, no mínimo, um Engenheiro Sênior ou Tech Lead responsável pela Segurança/Arquitetura. O Lint de Banco de Dados ou pre-commit hooks de revisão de migrações validará essa documentação.
