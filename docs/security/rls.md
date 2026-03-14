# RLS em Desenvolvimento

## Habilitar RLS

```sql
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "members" FORCE ROW LEVEL SECURITY;
ALTER TABLE "agents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agents" FORCE ROW LEVEL SECURITY;
ALTER TABLE "workflows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflows" FORCE ROW LEVEL SECURITY;
```

## Desabilitar RLS temporariamente

```sql
ALTER TABLE "organizations" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "members" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "agents" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "workflows" NO FORCE ROW LEVEL SECURITY;
```

## Fixar o tenant da sessão

```sql
SELECT set_config('app.current_tenant_id', 'tenant-alpha', true);
SELECT get_current_tenant_id();
```

## Testar policy com psql

```sql
BEGIN;
SELECT set_config('app.current_tenant_id', 'tenant-alpha', true);
SELECT * FROM workflows WHERE id = 'workflow-do-tenant-beta';
ROLLBACK;
```

Resultado esperado: `0 rows`.

## Bypass controlado para superusers

```sql
SET row_security = off;
```

Use apenas em manutenção, seed e migração.

## Seed sem bloqueio indevido

O seed do Ciclo 2 grava dados por tenant explicitamente. Em ambiente de dev, rode o seed com uma role de manutenção ou com `row_security = off` durante a carga inicial e reative o comportamento padrão antes de validar isolamento.
