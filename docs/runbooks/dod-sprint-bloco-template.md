# Runbook Curto por Bloco (Template DoD Sprint)

> Use este template para cumprir o DoD de sprint com evidência operacional mínima por entrega.

## Bloco
- Nome:
- Serviço/fluxo crítico:
- Responsável:

## Sinais de problema (gatilho)
- Ex.: erro 5xx acima do limiar por 5 min.
- Ex.: fila com backlog crescente por 10 min.

## Diagnóstico rápido (2–3 passos)
1. Verificar dashboard da métrica principal do bloco.
2. Correlacionar logs com `trace_id`/`request_id`.
3. Conferir deploy/flags/configuração mais recente.

## Ação imediata
- Mitigação principal:
- Mitigação alternativa:

## Rollback
- Comando/processo de rollback:
- Critério para acionar rollback:

## Evidências do DoD
- Link do teste automatizado mínimo:
- Link do dashboard:
- Link do alerta:
- Link da consulta de logs:
