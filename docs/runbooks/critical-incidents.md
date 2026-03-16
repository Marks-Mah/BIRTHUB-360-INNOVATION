# Runbook — Incidentes Críticos (P0/P1)

## Objetivo
Padronizar resposta a incidentes críticos para reduzir MTTR.

## Severidade
- **P0:** indisponibilidade total de fluxo crítico.
- **P1:** degradação severa com impacto relevante.

## Passos iniciais (até 15 min)
1. Confirmar escopo e serviços afetados.
2. Abrir incidente com timestamp de início.
3. Acionar on-call responsável.
4. Publicar primeira comunicação interna.

## Diagnóstico rápido
- Verificar healthcheck do `apps/api` e do `api-gateway` em modo compatibilidade.
- Verificar backlog/erro em filas (BullMQ/Redis).
- Verificar disponibilidade de DB.
- Verificar últimos deploys e flags ativadas.

## Rollout de Auth/Tenant e Dashboard
- Monitorar picos de `401`, `403` e `402` na `apps/api`.
- Monitorar rejeições em `POST /api/v1/tasks` para confirmar que chamadas anônimas estão sendo bloqueadas.
- Investigar falhas de troca de tenant (`x-active-tenant`) em logs de autorização e membership.
- Confirmar que auditoria de mutações sensíveis mantém `actorId`, `tenantId` e `requestId`.
- Confirmar que dashboard e satélites estão consumindo `apps/api` ou a casca compatível aprovada, nunca `x-tenant-id` cru.
- Comparar backlog de fila, custo estimado e volume de LLM antes/depois do rollout para detectar abuso operacional removido.

## Mitigação
- Rollback de deploy recente, se aplicável.
- Desativar feature flag suspeita.
- Isolar integração externa degradada com fallback.
- Reprocessar DLQ após estabilização.

## Evidência mínima antes de encerrar
- `/health` e `/health/deep` da `apps/api` verdes.
- Alertas `ApiUnauthorizedSpike`, `ApiBudgetExceededSpike` e `ApiTaskIngestionRejections` dentro da linha esperada.
- Nenhuma mutação sensível recente sem autoria rastreável.
- Dashboard autenticando via sessão principal do `apps/api`.

## Encerramento
- Confirmar normalização de SLIs.
- Comunicar causa raiz preliminar.
- Abrir postmortem em até 48h.
