# HubSpot CRM Setup

## Objetivo
Sincronizar tenant, plano e `health_score` interno para o HubSpot sem depender do painel do app.

## Variaveis de ambiente
- `HUBSPOT_ACCESS_TOKEN`: token do private app do HubSpot.
- `HUBSPOT_BASE_URL`: padrao `https://api.hubapi.com`.

## Propriedade customizada obrigatoria
Crie manualmente no HubSpot Admin a propriedade de company:

- Label: `BirthHub Health Score`
- Internal name: `bh_health_score`
- Group: `Company information` ou um grupo customizado `BirthHub`
- Type: `Number`

## Propriedades enviadas pelo worker
- `bh_arr_cents`
- `bh_health_score`
- `bh_plan_code`
- `bh_subscription_status`
- `bh_tenant_id`
- `domain`
- `name`

## Quando a sync roda
- `tenant.created`
- `subscription.upgraded`
- cron diario do `healthScore`

## Retry e rate limit
- respostas `429` levantam `HubspotRateLimitError`
- a fila `engagement.crm-sync` usa retry com backoff exponencial no BullMQ
- eventos de sync ficam persistidos em `crm_sync_events`

## Validacao local
Sem `HUBSPOT_ACCESS_TOKEN`, o adapter entra em modo mock e registra o corpo enviado no banco para revisao segura.
