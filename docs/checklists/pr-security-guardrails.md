# PR Security Guardrails Checklist

- [ ] Sensitive reads and all mutations use `requireAuthenticatedSession`.
- [ ] Administrative routes use explicit `RequireRole(...)`.
- [ ] Tenant binding comes from verified auth, not `x-tenant-id`.
- [ ] `x-active-tenant` is only used after membership validation.
- [ ] No unsigned JWT decode is used to derive identity.
- [ ] No `default-tenant` or `birthhub-alpha` fallback is introduced.
- [ ] No sensitive mutation records `actorId: null`.
- [ ] No runtime secret falls back to a hard-coded development default.
- [ ] No critical operational state is kept only in local memory.
- [ ] Health and readiness checks validate mandatory dependencies.
- [ ] Dashboard, satellites and gateway compatibility paths delegate auth/tenant resolution to `apps/api`.
- [ ] Negative tests cover anonymous access, header spoofing, invalid bearer tokens, tenant switch abuse, and insufficient role.
- [ ] `scripts/security/check-auth-guards.ts` covers the new router or entrypoint.
