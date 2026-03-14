# Operação do API Gateway

## Segurança
- JWT obrigatório para `/api/*`.
- Autorização por `scopes` e `roles` em rotas críticas.
- Validação de assinatura de webhook por provedor (HMAC/JWT).

## Resiliência
- Idempotência para todos webhooks recebidos.
- Rate limit global e adicional por tenant/rota.
- Erros padronizados no formato `error.code`, `error.message`, `error.details`.

## Observabilidade
- Correlação via `trace_id`, `request_id` e `job_id`.
- Logs estruturados via middleware cloud logging.
- Operações administrativas em filas registram eventos JSON com `event`, `queue`, `job_id`, `trace_id`.

## Rotas administrativas de filas
- `POST /admin/jobs/check-alerts`:
  - Verifica falhas nas filas críticas.
  - Aciona alertas com severidade `critical` quando necessário.
- `POST /admin/jobs/:queue/retry-failed`:
  - Reprocessa jobs em estado `failed`.
  - Valida `queue` e retorna `400 INVALID_QUEUE` para filas inválidas.
- `POST /admin/jobs/:queue/:jobId/cancel`:
  - Tenta cancelar execução de um job específico.
  - Comportamento idempotente:
    - retorna `cancelled` quando o estado é cancelável (`waiting`, `delayed`, `prioritized`, `paused`);
    - retorna `not_found` para job inexistente;
    - retorna `active_not_cancellable` para job em execução;
    - retorna `already_finalized` para jobs já concluídos/finalizados.

## Webhooks suportados
- Stripe: `stripe-signature` (HMAC SHA-256)
- DocuSign: `authorization` (JWT)
- Meta Ads: `x-hub-signature-256` (HMAC SHA-256)
