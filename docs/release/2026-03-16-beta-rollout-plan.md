# Beta Rollout Plan - 2026-03-16

## Objetivo
Sair de staging validado para um beta controlado, com canario e rollback definidos.

## Pre-condicoes

- [`docs/release/2026-03-16-staging-validation-runbook.md`](C:/Users/Marks/Documents/GitHub/BIRTHUB-360-INNOVATION/docs/release/2026-03-16-staging-validation-runbook.md) concluido.
- `release:preflight:production` executado com segredos reais e sem bloqueios.
- rollback de banco e de app testado em staging.

## Fases

### Fase 0 - Interno

- 2 tenants internos.
- 48 horas de observacao.
- foco em login, onboarding, billing e outputs.

### Fase 1 - Beta assistido

- 5 tenants externos com onboarding acompanhado.
- janela de 7 dias.
- suporte sincronizado para feedback de UX, billing e automacoes.

### Fase 2 - Beta ampliado

- 10 a 15 tenants.
- habilitar convites por lote apenas se Fase 1 ficar estavel.

## Gates de avancao

- taxa de sucesso de login > 99%.
- falha de checkout ou portal < 2%.
- workflows/agentes com sucesso > 95%.
- backlog de fila abaixo do threshold operacional.
- zero incidentes P1/P2 por 7 dias corridos.

## Triggers de rollback

- erro 5xx repetido no fluxo login -> billing -> output;
- webhook de Stripe ou fila com perda de eventos;
- aumento sustentado de falha de agente/workflow acima de 5%;
- incidente de isolamento de tenant ou auth guard.

## Saidas esperadas ao final do beta

- lista dos bugs P1/P2 fechados;
- baseline de latencia e falhas por tenant;
- decisao formal de abrir producao geral ou manter beta restrito.
