# ADR-005: Estratégia de Banco de Dados e Migrations

## Status

Accepted

## Context

O BirthHub 360 utiliza PostgreSQL como repositório primário de dados relacionais e o Prisma como ORM para a camada TypeScript (que por sua vez reflete ou dita os schemas usados pelos agentes Python via SQLAlchemy/SQLModel). Com múltiplos microserviços e alta concorrência em produção, atualizar o esquema do banco de dados (ex: adicionar colunas, criar índices ou dropar tabelas) é a operação de maior risco de "Outage". Precisamos estabelecer regras para migrações contínuas (CI/CD) sem incorrer em Downtime (Zero-Downtime Deploy).

## Análise de Estratégias

1. **O Modelo "Rebuild & Reboot"**: Para o tráfego, roda os scripts ALTER TABLE pesados e depois levanta as APIs.
   - _Desvantagem_: Causa indisponibilidade de minutos (Downtime). Inaceitável para recebimento de webhooks e agentes contínuos.

2. **O Modelo "Zero-Downtime Migration" (Expand and Contract)**: Nenhuma migração destrutiva é feita na mesma release do código que depende dela. Operações DDL são desacopladas.

## Decision

Adotamos o padrão **Expand and Contract (Zero-Downtime)** utilizando o `Prisma Migrate` no pipeline.

### O fluxo de migração DEVE seguir a regra de 2 fases:

1. **Fase Expand (Adicionar):** Criar a nova coluna ou tabela e permitir que a aplicação antiga ignore-a, ou que a aplicação nova escreva na nova E na antiga.
2. **Fase Contract (Deletar):** Apenas depois que 100% dos containers (Revisões) em Produção foram atualizados e estão usando o novo formato, a coluna/tabela antiga pode ser excluída (Drop) num _PR subsequente_ (geralmente dias ou semanas depois).

### Operações Destrutivas (RENAME e DROP)

- **NUNCA** renomeie uma coluna numa mesma migração onde o código subirá. O Prisma `migrate dev` pode sugerir renomeação, mas isso derruba os containeres velhos que ainda estão respondendo a requests antigos antes do fim da troca de tráfego. Crie a nova, migre os dados (Data Migration), faça o código apontar para a nova e, no ciclo seguinte, "drope" a velha.

### Índices Concorrentes

- Para bancos em produção de grande escala (milhões de registros de eventos de LangGraph), criar um index tradicional (`CREATE INDEX`) tranca a tabela para inserção/update. O Prisma deve ser parametrizado para usar `CREATE INDEX CONCURRENTLY` nos scripts `.sql` gerados ou executá-los em horários de baixíssimo uso caso o Concurrently não seja suportado em blocos transacionais nativos do Prisma.

## Consequences

- Desenvolvedores precisam pensar de forma retrocompatível. O banco de dados no momento T sempre suportará a Aplicação na versão V (Nova) e V-1 (Antiga).
- Migrations com Rollback Automático (Down migrations) não são suportadas nativamente pelo fluxo padrão do Prisma. Se um script de DB falhar no meio, um "Fix Forward" (Novo PR com o reparo) deverá ser aplicado de imediato, ou um restauro parcial do Snapshot.
- Squash de Migrations ocorrerá a cada ciclo de Release Major (ex: trimestral) onde o histórico de dezenas de `00x_migration` na pasta do Prisma é compactado para não poluir o repositório, após garantir que todas as bases estão atualizadas.
