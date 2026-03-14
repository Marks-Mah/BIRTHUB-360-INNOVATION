# Process: Permissions Audit

## Overview
To maintain a secure authorization posture and ensure the principle of least privilege, the permissions matrix and actual user assignments must be regularly audited. This document defines the frequency, responsibilities, and procedures for these audits.

## 1. Automated Checks (Continuous)

### CI/CD Pipeline
*   **Role Guard Linter:** A static analysis tool (e.g., ESLint custom rule or structural test) must run on every Pull Request to verify that all new or modified API endpoints (`apps/api-gateway/src/routes/*.ts`) have an explicit role guard applied (or are explicitly marked as public).
*   **Schema Validation:** Automated tests must verify that Zod schemas for `create` and `update` actions do not allow mass assignment of privileged fields (like `role` or `tenantId`).

### Runtime Monitoring
*   **Privilege Escalation Alerts:** The `AlertService` must trigger a high-priority alert if an authenticated user repeatedly receives `403 Forbidden` errors when attempting to access administrative endpoints (indicating potential probing).

## 2. Periodic Review (Quarterly)

Every quarter, the Security and Engineering leads must perform a manual review of the permissions framework.

### Review Steps:
1.  **Matrix Verification:** Review `docs/PERMISSIONS.md`. Are there new resources or roles that are not documented? Do the documented permissions still align with business needs?
2.  **Implementation Drift:** Compare the documented matrix against the actual middleware implementation in the API Gateway. Are there endpoints that are documented as restricted but are implemented loosely?
3.  **Cross-Tenant Boundaries:** Review the Tenant Context middleware to ensure no logic has been introduced that could accidentally leak data across tenant boundaries (e.g., missing `where: { tenantId }` in Prisma queries).

## 3. Tenant Administrator Audits (Self-Service)

Tenant administrators (`ADMIN` role) are responsible for managing their own users. The platform must provide them with the tools to conduct their own audits.

*   **Visibility:** The "Team Management" dashboard must clearly display the assigned role for every active and suspended user.
*   **Audit Trail Logs:** Tenant admins must have access to a read-only audit log detailing "Who changed what role and when." If Admin A promotes User B to Admin, Admin C must be able to see that event in the logs.
*   **Offboarding Checklist:** See `Policy-Offboarding.md` (to be created) for ensuring permissions are revoked immediately when an employee departs.
