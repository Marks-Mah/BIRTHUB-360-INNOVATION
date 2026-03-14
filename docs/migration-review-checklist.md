# Checklist de Revisão de Migration (PRs)

As migrações de banco de dados são os pontos de maior risco de quebra de operação na pipeline de RevOps. Como Validador ou Revisor de um PR que contém arquivos `.sql` gerados ou novos blocos no `schema.prisma`, siga rigorosamente este checklist antes de clicar em `Approve`.

## Checklist de Aprovação

- [ ] **Compatibilidade da Convenção de Nomes:** O autor usou o decorador `@@map` nas tabelas e `@map` nas colunas? Os nomes gerados no SQL estão em `snake_case`?
- [ ] **Não há "DROP TABLE" ou "DROP COLUMN" prematuros:** O PR não remove tabelas/colunas ativas. Drops só são aprovados se a coluna já foi depreciada na Sprint/Release anterior e o tráfego nela é zero. (Ver ADR-005).
- [ ] **Retrocompatibilidade de Dados (NOT NULL):** Se o autor adicionou uma nova coluna com a restrição `NOT NULL` (Obrigatória), ele **forneceu um `DEFAULT`**? Se não houver default, a migração falhará imediatamente em Produção porque a tabela já possui milhões de registros anteriores sem essa coluna.
- [ ] **Avaliação de Locks e Índices:** Há adições de índices? Tabelas massivas não podem ser indexadas em transações bloqueantes (sem `CONCURRENTLY`) no meio do expediente sem escalar para os Tech Leads/DBAs. (Ver Documento de Riscos).
- [ ] **Multi-Tenant Seguro:** Se uma nova tabela foi criada (Ex: `Notes` para Leads), ela possui a coluna `tenant_id` e a FK correspondente para segregar os dados e satisfazer o RLS?
- [ ] **Seed / Factory:** Se a estrutura base mudou de forma drástica, o autor atualizou o `seed.ts` e os mocks nos testes dos agentes Python para que o CI continue passando?

## O que Rejeitar Imediatamente:

- Ramo (Branch) querendo modificar uma "Migration SQL já aplicada" na main. Migrations são **imutáveis**. Se faltou algo, crie uma nova migration.
- `schema.prisma` modificado sem o envio do script SQL equivalente (Esqueceu de rodar `prisma migrate dev` para gerar a pasta da migração).
