# Security Coverage Report

- generatedAt: 2026-03-15T18:45:27.291Z
- semgrep: unknown
- dependency_scan: unknown
- rbac_suite: unknown
- zap_baseline: unknown

## Modules

| Module | Checks |
| --- | --- |
| auth | login/logout/session rotation + MFA challenge tests |
| rbac | role matrix on critical endpoints |
| api-keys | introspection + scoped auth guards |
| web | CSP report-only, origin checks, CSRF double-submit |
| worker | signed payload verification + tenant context checks |
