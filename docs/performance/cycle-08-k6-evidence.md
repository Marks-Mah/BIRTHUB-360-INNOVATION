# Ciclo 08 - Evidencias de Carga K6

Data de consolidacao do fluxo: 2026-03-13

## Objetivo

Padronizar onde os logs de performance do K6 sao gerados, anexados e revisados antes do merge da branch principal.

## Comando oficial

- `pnpm test:load:k6`

## Artefatos obrigatorios

- `test-results/k6/cycle-08-stress-summary.json`
- `test-results/k6/cycle-08-stress-summary.txt`

Os dois arquivos sao emitidos automaticamente por `scripts/load-tests/stress.js` via `handleSummary`.

## Conteudo minimo esperado

- Timestamp da execucao.
- `BASE_URL` e `TENANT_ID` utilizados.
- Metricas de `http_reqs.rate` e `iterations.rate`.
- Latencia `http_req_duration` em `p(95)` e `p(99)`.
- Taxa `http_req_failed.rate`.
- Resultado dos thresholds:
  - `http_req_duration p(95) < 300ms`
  - `http_req_failed rate < 1%`

## Status desta sessao

- Em 2026-03-13 o binario `k6` nao estava instalado neste ambiente.
- Nao ha log de carga real gerado nesta sessao.
- O repositório foi ajustado para bloquear futuras omissoes silenciosas: o script agora produz os artefatos acima automaticamente quando o teste for executado em ambiente habilitado.

## Checklist antes do merge para `main`

1. Executar `pnpm test:load:k6` em ambiente com API, autenticação e fila ativas.
2. Confirmar que `test-results/k6/cycle-08-stress-summary.json` foi gerado sem truncamento.
3. Confirmar que `test-results/k6/cycle-08-stress-summary.txt` registra `PASS` para ambos os thresholds.
4. Atualizar `docs/release/cycle-08-performance-report.md` com data, ambiente e conclusao da execucao real.
