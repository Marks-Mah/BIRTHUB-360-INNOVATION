# Tenant And Auth Guardrails

## Edge Contract

- `request.context` starts empty for auth and tenant fields.
- Authentication is resolved only by verified session or verified API key.
- `request.context.organizationId` is the organization identifier.
- `request.context.tenantId` is the canonical authorized tenant identifier.
- Raw request headers are not trusted as identity.

## Tenant Resolution

- `x-tenant-id` is not an access control shortcut.
- `x-active-tenant` is a post-auth selector only.
- Active tenant switching requires:
  - a valid authenticated session;
  - a real `userId`;
  - a persisted active membership in the requested tenant.
- Missing tenant, missing membership, or forbidden tenant switch must fail with `401`, `403`, or `404` as appropriate.

## Router Pattern

Use this order for secure routes:

1. `requireAuthenticatedSession`
2. `RequireRole(...)` when the route is administrative
3. `RequireFeature(...)` only as an additional business gate
4. validation and handler logic

Feature gates are never auth gates.

## Public Route Allowlist

These routes may remain public by contract when they enforce their own integrity rules:

- health endpoints
- login and refresh
- organization bootstrap
- signed webhooks
- invite acceptance by token

Everything else should assume authenticated session first.

## Durable State

- Budget limits and consumption are stored in Postgres.
- Output artifacts are stored in Postgres.
- Redis remains a transport and cache layer, not the source of truth.

## Audit Rules

- Sensitive mutations require a real actor.
- Audit trails must capture actor, tenant, action, and entity.
- Silent or anonymous administrative mutations are forbidden.
