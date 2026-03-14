import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const reportDirectory = resolve(process.cwd(), "docs/security");
const reportPath = resolve(reportDirectory, "security-coverage-report.md");

mkdirSync(reportDirectory, { recursive: true });

const now = new Date().toISOString();
const semgrep = process.env.SEMGREP_STATUS ?? "unknown";
const npmAudit = process.env.NPM_AUDIT_STATUS ?? "unknown";
const rbac = process.env.RBAC_STATUS ?? "unknown";
const zap = process.env.ZAP_STATUS ?? "unknown";

const markdown = `# Security Coverage Report

- generatedAt: ${now}
- semgrep: ${semgrep}
- dependency_scan: ${npmAudit}
- rbac_suite: ${rbac}
- zap_baseline: ${zap}

## Modules

| Module | Checks |
| --- | --- |
| auth | login/logout/session rotation + MFA challenge tests |
| rbac | role matrix on critical endpoints |
| api-keys | introspection + scoped auth guards |
| web | CSP report-only, origin checks, CSRF double-submit |
| worker | signed payload verification + tenant context checks |
`;

writeFileSync(reportPath, markdown, "utf8");
console.log(`Security report generated at ${reportPath}`);
