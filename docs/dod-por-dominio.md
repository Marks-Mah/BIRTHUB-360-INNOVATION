# Definition of Done por domínio

## API Gateway
- Código com validação de payload e erros tipados.
- Testes críticos + contract tests passando no CI.
- Logging com correlação (`trace_id`, `request_id`) e catálogo de erro em integrações.
- Evidência: links para testes e artefatos de build.

## Orchestrator
- Fluxos críticos com contrato versionado de entrada/saída.
- Chamadas externas com timeout explícito, retry e circuit breaker.
- Métricas/logs com resultado das ações (`actions_taken`, `error_code`).
- Evidência: execução de fluxo com payload v1.

## Integrações externas
- Acesso via adapter por domínio (sem provider direto no core).
- Política de resiliência comum aplicada.
- Fallback observável via catálogo de erros padronizado.
- Evidência: teste automatizado cobrindo timeout/retry/circuit breaker.
