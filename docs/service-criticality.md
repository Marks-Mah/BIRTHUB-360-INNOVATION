# Matriz de Criticidade por Serviço

## Níveis
- **P0 (Crítico):** indisponibilidade causa interrupção de receita/operação central.
- **P1 (Alto):** degradação severa com workaround parcial.
- **P2 (Médio):** impacto moderado, sem parada total.

## Serviços

| Serviço | Criticidade | Justificativa | RTO | RPO |
|---|---|---|---|---|
| `apps/api-gateway` | P0 | Porta de entrada de APIs e integrações externas. | 30 min | 5 min |
| `apps/agent-orchestrator` | P0 | Coordena fluxos de negócio multiagente. | 30 min | 10 min |
| `packages/db` (PostgreSQL/Prisma) | P0 | Persistência transacional principal. | 30 min | 5 min |
| `packages/queue` (BullMQ/Redis) | P1 | Execução assíncrona e jobs críticos. | 1 h | 15 min |
| `apps/webhook-receiver` | P1 | Entrada de eventos de terceiros. | 1 h | 15 min |
| `agents/*` | P1 | Execução especializada por domínio. | 2 h | 30 min |
| `apps/dashboard` | P2 | Camada de visualização; não bloqueia processamento interno. | 4 h | 1 h |
| `packages/integrations` | P1 | Dependência de provedores externos e faturamento/comunicação. | 1 h | 15 min |

## Diretriz de atendimento
- Incidentes **P0**: acionamento imediato de on-call + comunicação a cada 30 min.
- Incidentes **P1**: triagem em até 15 min + comunicação horária.
- Incidentes **P2**: tratativa em horário comercial, salvo escalonamento.
