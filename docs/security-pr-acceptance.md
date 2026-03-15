# Security PR Acceptance

Every PR that touches `apps/api`, authentication, tenant resolution, RBAC, billing gates,
dashboard auth, satellites, or legacy entrypoints must satisfy these checks before merge.

## Mandatory Gates

- `requireAuthenticatedSession` protects every sensitive read and every mutating route unless the route is explicitly public by contract.
- `RequireRole(...)` protects every administrative route.
- `x-tenant-id` is never used as an authorization source.
- `x-active-tenant` is only handled in `apps/api/src/middlewares/tenantContext.ts` after a valid authenticated session and a persisted membership check.
- JWT claims are never decoded without verification to build identity or tenant context.
- Feature flags never replace authentication or RBAC.
- No production path uses `default-tenant`, `birthhub-alpha`, or any equivalent tenant fallback.
- Sensitive mutations never write `actorId: null`.
- Critical operational state is not kept only in process memory for budgets, outputs, refresh tokens, API keys, or auth state.
- Health/readiness endpoints fail when mandatory dependencies are down.
- Legacy `apps/api-gateway` flows stay frozen outside explicit local development escape hatches.

## Required Negative Coverage

- Anonymous requests fail for sensitive routes.
- Header-only requests using `x-tenant-id` fail.
- Forged or invalid bearer tokens fail.
- Tenant switching without valid membership fails.
- Administrative routes fail for insufficient roles.
- Legitimate session-based authorized flows still succeed.

## CI Enforcement

- `scripts/security/check-auth-guards.ts` must pass.
- New sensitive routers must be included in the scanner scope.
- Route changes without updated negative tests must be rejected.

## Review Checklist

- [ ] The route is explicitly public or uses `requireAuthenticatedSession`.
- [ ] The route uses `RequireRole(...)` when it changes state or exposes administrative data.
- [ ] Tenant binding comes from authenticated context, not from raw headers.
- [ ] The implementation does not decode unsigned JWT payloads to derive identity.
- [ ] The implementation does not introduce insecure tenant or secret defaults.
- [ ] Sensitive mutations record a real actor and a real tenant.
- [ ] Negative tests cover spoofing, bypass, invalid token, and role failure cases.
- [ ] Legacy codepaths are frozen or redirected instead of extended.
