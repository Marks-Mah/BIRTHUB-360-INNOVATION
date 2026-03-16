# Observabilidade e SLOs

## Padrões
- Correlation ID ponta-a-ponta via `x-correlation-id` no BFF.
- Health endpoint deve refletir dependências reais (API upstream no gateway).

## SLOs base
- Auth disponibilidade >= 99.9%
- Workflow enqueue p95 < 500ms
- Webhook processing sucesso >= 99.5%
