# Guia de Operações (Runbook)

## Monitoramento e Logs
- Verifique o Sentry para rastrear exceções e o dashboard do Pino/OTel para logs.

## Banco de Dados
- Para reiniciar localmente: `pnpm run reset-db`.

## Reversão de Deploys
- Utilize a interface do GitHub Actions ou reverta o commit de merge caso haja falha crítica na main (rollback manual ou via pipeline).
