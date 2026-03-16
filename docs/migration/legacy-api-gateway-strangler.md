# Legacy API Gateway Strangler Plan

## Current Policy

- `apps/api` is the primary authenticated edge.
- `apps/api-gateway` is frozen and must not receive new product features.
- Legacy auth bootstrap is disabled unless an explicit local-development escape hatch is enabled.
- Production and CI traffic must not rely on the legacy gateway for identity issuance.
- The gateway now runs in proxy mode by default, forwarding traffic to `apps/api`.

## Escape Hatches

Local development may opt in explicitly with:

- `LEGACY_API_GATEWAY_ENABLE_DEV_COMPAT=true`

If this flag is absent, the gateway keeps only health/docs locally and proxies application traffic to `apps/api`.

## Convergence Direction

- Move consumers from `@birthub/db` to `@birthub/database`.
- Move dashboard and satellite auth to the main `apps/api` session boundary.
- Keep only the minimum internal compatibility surface in the gateway while remaining traffic is diverted to `apps/api`.
- Remove conflicting auth and tenant policies instead of preserving both stacks indefinitely.

## Residual Work

- Remaining legacy consumers still need runtime migration to the primary edge.
- Internal compatibility routes still need eventual porting or retirement so `apps/api-gateway` can be fully decommissioned.
- Legacy DB package usage should continue to shrink until one client/schema remains.
