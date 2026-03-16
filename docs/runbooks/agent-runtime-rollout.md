# Agent Runtime Rollout

## Objective

Roll out the live manifest runtime with queue hardening, approvals, metrics and budget controls without exposing all tenants at once.

## Stage 1: Internal Staging

- Bring up `postgres`, `redis`, `api`, `worker` and `web`.
- Run the live smoke validation.
- Validate these paths:
  - install agent
  - manual live run
  - workflow `AGENT_EXECUTE`
  - output artifact creation
  - output approval
  - metrics and budget events
- Exit only if:
  - no queue backlog growth after test traffic
  - no approval artifacts lost
  - no failed budget writes
  - fail-rate alerts and pending approvals visible in admin operations

## Stage 2: Pilot Tenants

- Enable only for a small set of internal or design-partner tenants.
- Limit to low-risk manifest packs first.
- Monitor:
  - queue pending and active counts
  - fail-rate alerts
  - budget warnings and blocks
  - pending approval age
  - worker error rate

Exit only if:

- no critical incident across 7 consecutive days
- approval turnaround remains within agreed SLA
- top-cost agents remain within expected budget profile

## Stage 3: Controlled Expansion

- Expand by tenant cohorts and by pack criticality.
- Keep sensitive packs behind owner-level approvals.
- Review fail-rate and cost trends before each cohort expansion.

## Rollback Triggers

- sustained queue backlog above threshold
- repeated `AGENT_TOOL_CIRCUIT_OPEN` on core tools
- budget blocks firing unexpectedly across many tenants
- outputs created without audit links
- approvals page not reflecting pending governed artifacts

## Rollback Actions

- pause new live runs for affected tenants
- keep installed agents readable but disable execution entrypoints
- drain/inspect worker queues
- revert to last known good runtime build
- preserve artifacts, audit logs and pending approvals for replay
