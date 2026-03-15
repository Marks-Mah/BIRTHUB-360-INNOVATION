# Legacy API Gateway Strangler Plan

## Current Policy

- `apps/api` is the primary authenticated edge.
- `apps/api-gateway` is frozen and must not receive new product features.
- Legacy auth bootstrap is disabled unless an explicit local-development escape hatch is enabled.
- Production and CI traffic must not rely on the legacy gateway for identity issuance.

## Escape Hatches

Local development may opt in explicitly with:

- `ALLOW_LEGACY_API_GATEWAY=true`
- `LEGACY_ALLOW_INSECURE_DEV_AUTH=true`
- `LEGACY_ALLOW_DEV_PRINCIPAL_BOOTSTRAP=true`

If these flags are absent, the legacy gateway should return `410` for authenticated flows and direct operators to `apps/api`.

## Convergence Direction

- Move consumers from `@birthub/db` to `@birthub/database`.
- Move dashboard and satellite auth to the main `apps/api` session boundary.
- Port any still-needed internal routes into `apps/api`.
- Remove conflicting auth and tenant policies instead of preserving both stacks indefinitely.

## Residual Work

- Remaining legacy consumers still need runtime migration to the primary edge.
- Dashboard data routes still need full session convergence onto `apps/api`.
- Legacy DB package usage should continue to shrink until one client/schema remains.
