# Runbook — Canary de Auth/Tenant

## Objetivo
Validar o rollout do hardening de autenticação, tenant binding e ingestão autenticada antes de ampliar tráfego.

## Checklist de canário
- Verificar `401/403` na `apps/api` por rota e por tenant.
- Verificar `402` e `429` em `/api/v1/tasks`.
- Verificar falhas de `x-active-tenant` nos logs de membership/authorization.
- Verificar que `apps/dashboard` autentica via `/api/v1/auth/login` e `/api/v1/me`.
- Verificar que `apps/api-gateway` está em `mode=proxy` ou `mode=compat-dev`, nunca emitindo auth própria em produção/CI.
- Verificar que `apps/agent-orchestrator` e `apps/webhook-receiver` reportam dependências reais em `/health`.
- Verificar que auditoria recente não contém `actorId: null` nas mutações sensíveis.

## Sinais de rollback
- Crescimento sustentado de `401/403` em rotas que deveriam estar autorizadas.
- Crescimento de `402` sem correlação com consumo real.
- Dashboard preso em redirect loop de `/login`.
- Rejeições em `/api/v1/tasks` afetando usuários autenticados legítimos.
- Health degradado em satélites ou aumento anormal de backlog/custo de fila.

## Ações
- Pausar expansão de tráfego.
- Revisar cookies de sessão, CSRF e membership do tenant ativo.
- Confirmar que clientes restantes não estão usando `x-tenant-id`, `default-tenant` ou `birthhub-alpha`.
