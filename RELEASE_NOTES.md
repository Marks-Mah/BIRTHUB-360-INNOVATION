# RELEASE NOTES

## Versão

v1.0.0-base-agent-hardening

## Features implementadas

- Base Agent com controles adicionais de robustez:
  - Rate limiting por tenant (janela de 60s, configurável por env var).
  - Circuit breaker para falhas consecutivas (threshold/janela/duração configuráveis).
  - Gerenciamento de contexto com truncamento de mensagens para evitar crescimento descontrolado.
  - Limpeza do estado de falhas após execução bem-sucedida.
- Ampliação da suíte de testes unitários para cobrir:
  - execução padrão do agente,
  - bloqueio por rate limit,
  - bloqueio por circuit breaker aberto,
  - truncamento de histórico/contexto.

## Breaking changes

- Não há breaking changes de interface pública.
- O comportamento de execução agora pode retornar erro antecipado quando:
  - limite por tenant é excedido,
  - circuit breaker está aberto.

## Como fazer deploy para produção

1. Build e validações:
   - `pnpm install`
   - `python -m pytest agents/shared/tests/test_base_agent.py -q`
2. Publicar imagem/container dos serviços de agentes.
3. Configurar variáveis opcionais de runtime:
   - `AGENT_MAX_CONTEXT_MESSAGES`
   - `AGENT_RATE_LIMIT_PER_MINUTE`
   - `AGENT_CIRCUIT_BREAKER_THRESHOLD`
   - `AGENT_CIRCUIT_BREAKER_WINDOW_SECONDS`
   - `AGENT_CIRCUIT_BREAKER_OPEN_SECONDS`
4. Fazer rollout gradual (canário/blue-green) monitorando taxa de erro.

## Checklist de go-live

- [ ] Testes unitários de `agents/shared` passando
- [ ] Variáveis de ambiente validadas
- [ ] Observabilidade ativa (logs e alertas)
- [ ] Smoke test de execução de task por tenant
- [ ] Confirmação de fallback operacional em caso de circuit breaker
