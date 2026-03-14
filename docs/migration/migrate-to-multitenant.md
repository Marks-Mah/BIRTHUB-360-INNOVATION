# Migração para Multi-tenant

## Objetivo

Converter dados legados single-tenant para o modelo `tenantId` obrigatório com shared schema e RLS.

## Janela estimada

- Preparação: 15 min
- Backfill e validação: 30 a 60 min
- Cut-over: 15 min

## Passos

1. Gerar backup do banco.
2. Aplicar a migration do Ciclo 2.
3. Rodar `tsx scripts/migrate-to-multitenant.ts`.
4. Validar se não restaram linhas com `tenantId` nulo.
5. Rodar seed complementar apenas em dev, se necessário.
6. Executar a suite `test:isolation`.

## Queries de conferência

```sql
SELECT COUNT(*) FROM organizations WHERE "tenantId" IS NULL;
SELECT COUNT(*) FROM members WHERE "tenantId" IS NULL;
SELECT COUNT(*) FROM sessions WHERE "tenantId" IS NULL;
SELECT COUNT(*) FROM workflows WHERE "tenantId" IS NULL;
```

Todos os retornos devem ser `0`.

## Downtime

O plano segue a estratégia do ADR-009: preparar schema, executar backfill, fechar escrita por uma janela curta e então ativar a versão que exige tenant em todas as camadas.
