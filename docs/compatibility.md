# Backward Compatibility — Eventos e Payloads

## Eventos (assíncronos)
- Versionar eventos via campo `schema_version`.
- Consumidores devem ignorar campos desconhecidos.
- Alterações incompatíveis exigem novo tipo de evento (ex.: `lead.updated.v2`).
- Garantir idempotência via `event_id` globalmente único.

## Payloads HTTP
- Adição de campos: permitido (opcionais).
- Remoção/renomeação: proibido sem nova versão major.
- Tipo de dado: não alterar sem versão major.

## Rollout seguro
1. Produzir em formato antigo + novo (dual-write quando necessário).
2. Validar consumidores.
3. Migrar produtores/consumidores gradualmente.
4. Desativar formato legado apenas após janela de depreciação.
