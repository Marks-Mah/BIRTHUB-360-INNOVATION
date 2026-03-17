# ADR-033: Billing Canonical Ownership and Legacy Schema Cutover

- Status: Accepted
- Date: 2026-03-17

## Context

The repository had two competing data paths:

1. Canonical SaaS runtime on `@birthub/database` (multi-tenant, billing domain active in `apps/api`).
2. Legacy CRM runtime on `@birthub/db` (schema drift and incompatible domain models).

This split created architectural ambiguity and increased the risk of cross-tenant data mistakes, build failures, and governance drift. Billing side effects already run in `apps/api`, while legacy routes and workers still referenced the frozen schema.

## Decision

For Stage 1, the platform enforces the following:

1. `apps/api` is the only billing owner.
2. `packages/database` is the only schema for supported runtime surfaces.
3. `@birthub/db` is frozen legacy compatibility and cannot be imported by `apps/api-gateway` or `apps/agent-orchestrator`.
4. Legacy `apps/agent-orchestrator/src/agents/*` and `src/workers/*` are removed from the supported runtime path.
5. Legacy gateway `GET /agents/logs` now returns explicit `410 Gone` deprecation payload instead of using legacy repositories.

## Consequences

Positive:

- Removes active `@birthub/db` usage from supported gateway/orchestrator surfaces.
- Clarifies that billing and Stripe webhook domain mutations remain in `apps/api`.
- Adds guardrails in workspace audit to block new schema drift in code review and CI.

Trade-offs:

- Legacy CRM workers (`sdr`/`ldr`) are no longer runnable from `apps/agent-orchestrator`.
- Legacy agent log endpoint no longer returns historical payloads and requires migration to canonical telemetry APIs.
- `apps/dashboard` remains quarantined legacy until a dedicated migration stage.

## Follow-up

- Stage 7 defines final runtime consolidation and removal timeline for `packages/db`.
- Stage 8 enforces full CI gates for lint, typecheck and tests across canonical surfaces.
