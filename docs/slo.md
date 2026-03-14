# SLO/SLI por Serviço

## api-gateway
- **SLI disponibilidade:** requisições 2xx/3xx sobre total.
- **SLO disponibilidade mensal:** 99.9%
- **SLI latência p95:** tempo de resposta por rota.
- **SLO latência p95:** < 300ms (rotas CRUD), < 800ms (rotas agregadas)

## agent-orchestrator
- **SLI sucesso de workflow:** workflows concluídos sem erro/total.
- **SLO sucesso mensal:** 99.5%
- **SLI latência de workflow p95:** duração fim-a-fim por tipo de fluxo.
- **SLO latência p95:** < 120s para fluxos síncronos, < 10min para assíncronos.

## webhook-receiver
- **SLI aceite de webhook:** webhooks autenticados e enfileirados/total válidos.
- **SLO mensal:** 99.9%
- **SLI latência de aceite p95:** < 200ms.

## queue/worker
- **SLI atraso de fila p95:** tempo entre enqueue e início de processamento.
- **SLO atraso p95:** < 30s
- **SLI taxa de reprocessamento:** jobs em DLQ/total.
- **SLO DLQ mensal:** < 0.5%

## Banco de dados
- **SLI disponibilidade:** conexões bem-sucedidas/total.
- **SLO mensal:** 99.95%
- **SLI latência query p95:** consultas críticas por domínio.
- **SLO p95:** < 100ms (lookup), < 500ms (agregações)
