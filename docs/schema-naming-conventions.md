# Naming Conventions de Schema de Banco de Dados

Para garantir a harmonia entre o banco de dados relacional (PostgreSQL), os modelos gerados pelo ORM da nossa infra TypeScript (Prisma) e os data access layers consumidos pelos agentes de IA em Python, adotamos as seguintes convenções restritas.

## 1. Tabelas (Tables)

- **Convenção no SGBD**: `snake_case` e no PLURAL.
  - Exemplo: `users`, `agent_logs`, `payment_invoices`.
- **Mapeamento no Prisma**: No `schema.prisma`, os **Models** são declarados em `PascalCase` e singular, mapeando para as tabelas usando `@@map`.
  ```prisma
  model AgentLog {
    id        String   @id @default(cuid())
    tenantId  String   @map("tenant_id")

    @@map("agent_logs") // Garante que a tabela no BD seja 'agent_logs'
  }
  ```

## 2. Colunas (Columns)

- **Convenção no SGBD**: `snake_case`. (Não usar acentos nem caracteres especiais).
  - Exemplo: `created_at`, `tenant_id`, `stripe_customer_id`.
- **Mapeamento no Prisma**: No TypeScript as propriedades são `camelCase`. O mapeamento é feito via atributo `@map`.
  ```prisma
  createdAt DateTime @default(now()) @map("created_at")
  ```

## 3. Índices e Chaves Estrangeiras (Indexes / FKs)

Se o prisma gerar os nomes automaticamente, mantenha. Se for criar manualmente (para otimizações SQL puras):

- Chave Primária: `pk_nome_tabela` (Ex: `pk_users`)
- Chave Estrangeira: `fk_tabela_referenciada` (Ex: `fk_invoices_users`)
- Índices Únicos: `uq_tabela_colunas` (Ex: `uq_users_email`)
- Índices Padrão: `idx_tabela_colunas` (Ex: `idx_agent_logs_tenant_id`)

## 4. Enums

- **SGBD e Prisma**: Valores de Enumeração no Prisma (`enum`) devem estar em `PascalCase` para a definição do tipo, e os seus **valores** em `UPPER_SNAKE_CASE` no banco de dados e no código.
  ```prisma
  enum InvoiceStatus {
    PENDING
    PAID
    CANCELED
  }
  ```

## Justificativa (Por que o `@map` explícito é obrigatório?)

O PostgreSQL trata nomes sem aspas como case-insensitive (convertendo tudo para minúsculas internamente). Se não usarmos o `@map` para forçar o `snake_case` nas colunas e deixarmos o Prisma criar tabelas `CamelCase` como `"AgentLog"`, cada script SQL ou Metabase que tentar se conectar ao banco precisará usar aspas duplas em todos os lugares (`SELECT * FROM "AgentLog"`). O padrão `snake_case` unifica o uso nas integrações de Analytics e SQL raw do Python sem dores de cabeça.
