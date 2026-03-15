# Ciclo 8 — Telemetria

## 1) Diagnóstico
- **Problema encontrado:** confirmar trilha mínima de observabilidade (event tracking, logs, métricas).
- **Causa raiz:** necessidade de verificar instrumentação e logging distribuído.
- **Impacto:** sem observabilidade, incidentes e regressões ficam difíceis de detectar.

## 2) Plano
- Auditar uso de logger, eventos internos e OpenTelemetry.
- Confirmar presença em API e worker.

## 3) Execução
- Encontradas integrações em `apps/api/src/observability/otel.ts`, `apps/api/src/observability/sentry.ts` e múltiplos pontos de `createLogger` em API/worker.
- Event bus interno no worker identificado e com log estruturado.

## 4) Validação
- `rg -n "event|metric|telemetry|logger" apps/api/src apps/worker/src packages/logger/src` ✅

## 5) Evidência
- Este arquivo: `docs/evidence/observability.md`.
