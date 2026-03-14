# Análise de Risco de Migrations em Produção (PostgreSQL)

Executar Migrações DDL num banco de dados vivo e transacional (onde os Agentes de RevOps estão injetando Leads e Faturas via LangGraph por segundo) requer entender o comportamento do "Locking" do PostgreSQL.

## Os Maiores Vilões (Table Locks Exclusivos)

No PostgreSQL, certas operações adquirem o bloqueio `ACCESS EXCLUSIVE LOCK` na tabela. Isso significa que TODAS as leituras (`SELECT`) e escritas (`INSERT/UPDATE/DELETE`) ficarão penduradas esperando a migração acabar.

### Cenários Críticos e Mitigações

| Operação DDL                                          | Risco de Lock | Impacto Potencial                                                                                                                                     | Mitigação Obrigatória                                                                                                                                                                                                                                                     |
| ----------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CREATE INDEX`                                        | **ALTO**      | Tranca a tabela inteira pelo tempo do build do índice. Em tabelas com 5M+ linhas como `agent_logs`, pode levar 10 minutos. O gateway cairá (Timeout). | **Alterar SQL Gerado:** O PR deve modificar manualmente o `.sql` gerado pelo Prisma para utilizar a sintaxe `CREATE INDEX CONCURRENTLY`. Lembre-se: Índices concorrentes não podem rodar dentro de blocos de transação explícita. O script deve ser gerado separadamente. |
| `ALTER TABLE ADD COLUMN`                              | BAIXO         | Milissegundos. Geralmente seguro.                                                                                                                     | Se a coluna tiver um `DEFAULT` dinâmico (como um cálculo ou trigger), ela reescreverá a tabela (Table Rewrite) trancando tudo. Prefira defaults estáticos ou adicione nula e popule depois via worker (backfill em lote).                                                 |
| `ALTER TABLE ... TYPE` (Mudar Tipo)                   | **ALTO**      | O Postgres precisa verificar ou reescrever as páginas de dados da tabela inteira, trancando a operação na Production.                                 | Adicione uma **nova coluna** com o tipo correto, escreva nas duas, copie os dados velhos aos poucos e apague a velha (`Expand and Contract`).                                                                                                                             |
| Inserção/Atualização em Massa (`UPDATE table SET...`) | MÉDIO         | Lock das linhas específicas (Row Lock) e inchaço do log de transações (WAL/Vacuum).                                                                   | Nunca rode scripts DML de 1 milhão de linhas dentro de um arquivo de migration síncrona. Faça um job assíncrono BullMQ em lotes limitados (`LIMIT 5000`) para não sobrecarregar o I/O do DB.                                                                              |

## Prevenção Sistêmica

- **Statement Timeout:** Nossas rotinas de deployment devem injetar uma flag local de `statement_timeout` no executor da migração. Se a migração esbarrar num Lock e demorar mais que 15 segundos para completar a query estrutural, a engine aborta a migração imediatamente antes de causar uma fila fatal na Cloud.
