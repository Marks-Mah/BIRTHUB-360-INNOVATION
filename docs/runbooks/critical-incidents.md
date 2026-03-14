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
- Verificar healthcheck do `api-gateway`.
- Verificar backlog/erro em filas (BullMQ/Redis).
- Verificar disponibilidade de DB.
- Verificar últimos deploys e flags ativadas.

## Mitigação
- Rollback de deploy recente, se aplicável.
- Desativar feature flag suspeita.
- Isolar integração externa degradada com fallback.
- Reprocessar DLQ após estabilização.

## Encerramento
- Confirmar normalização de SLIs.
- Comunicar causa raiz preliminar.
- Abrir postmortem em até 48h.
