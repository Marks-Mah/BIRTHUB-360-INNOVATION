# ADR-009: Estratégia de Migração de Dados Legados para o Modelo Multi-Tenant (Shared Schema + RLS)

## Status
Accepted

## Contexto
O BirthHub360 operava inicialmente em um modelo rudimentar (ex: instâncias separadas por cliente ou schema genérico sem controle estrito de `tenant_id` em todas as tabelas). Para o Ciclo 2, implementamos a arquitetura de **Shared Schema com RLS (ADR-007)**.

Agora, precisamos migrar todos os dados legados existentes na produção para este novo formato sem causar corrupção de dados (Data Corruption), violação de chaves estrangeiras (Foreign Keys) ou tempo de inatividade inaceitável (Downtime).

## Decisão
Nós optaremos por uma estratégia de migração em **4 Fases (Blue/Green Migration no Nível de Tabela)**, focada em Janela de Manutenção Controlada. Não faremos migração "On-the-fly" (Lazy Migration) devido à complexidade do RLS.

## As Fases da Migração

1.  **Fase 1: Preparação de Schema (Add Columns & Nullable)**
    *   **Ação:** Criamos a coluna `tenant_id` (UUID) em todas as tabelas-alvo. Inicialmente, ela deve ser `NULLABLE` (Permite nulos) para não quebrar a aplicação que já está rodando em produção.
    *   **Ação:** Criamos as chaves estrangeiras (FKs) apontando para a tabela principal `organizations/tenants`, com a diretriz `ON DELETE CASCADE`.
2.  **Fase 2: Backfill (População de Dados Históricos)**
    *   **Ação:** Criamos scripts (Migrations/Workers) que varrem as tabelas e populam o `tenant_id` de cada linha baseando-se em relacionamentos ancestrais (Ex: Em um pedido `Order`, olhar para qual usuário ele pertence e copiar o `tenant_id` da tabela `User` associada).
    *   **Regra:** Isso roda em background com a aplicação "Viva" (Online), sem causar locks destrutivos.
3.  **Fase 3: O "Cut-over" (Janela de Manutenção)**
    *   **Ação:** Aplicação é colocada em Modo de Manutenção (Downtime).
    *   **Ação:** Rodamos um script final para preencher os registros que foram criados nos últimos minutos (Catch-up).
    *   **Ação Crítica:** Alteramos a coluna `tenant_id` para `NOT NULL` (Obrigatório).
    *   **Ação Crítica:** Executamos os scripts de *Index Creation* (`CREATE INDEX ... (tenant_id)`) e habilitamos o RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
4.  **Fase 4: Deploy do Novo Código**
    *   **Ação:** Lançamos a nova versão da API/Backend (Ciclo 2) que obriga o repasse do contexto do JWT e não funciona sem ele. A aplicação sai da manutenção.

## Raciocínio (Por que não migrar em tempo real?)
Tentar migrar para o RLS sem derrubar o sistema forçaria um estado intermediário onde a API Nova teria que lidar com tabelas que têm RLS ativado para registros novos, mas não para registros velhos. O risco de um bug na API causar vazamento ou deleção em massa dos dados não-migrados é inaceitável. O Downtime planejado (Cut-over) de 1 a 2 horas num fim de semana garante controle total.

## Consequências
*   A migração exige uma janela de manutenção global.
*   Exige a comunicação prévia aos clientes (ver Plano de Comunicação).
*   Dados que não puderem ser vinculados a um tenant (Dados Órfãos) durante o Backfill deverão ser descartados ou movidos para uma tabela de quarentena. Não podem receber `tenant_id` falso.