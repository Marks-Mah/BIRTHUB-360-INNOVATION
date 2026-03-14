# Risk Analysis: Workflow Approval Bypass

## 1. Threat Definition
An Approval Bypass occurs when a workflow that is configured to pause and wait for a human decision (an `ApprovalStep`) is artificially advanced without a legitimate, authorized user explicitly granting that approval through the standard UI or API.

This threat represents a severe breach of business logic integrity, potentially allowing unauthorized financial transactions, data exfiltration, or violation of compliance rules (e.g., SOX, SOC2).

## 2. Attack Vectors

### 2.1 Direct API Manipulation (Insecure Direct Object Reference - IDOR)
*   **The Attack**: An attacker (an internal user without the required role) discovers the `POST /api/workflows/approvals/{id}/resolve` endpoint and attempts to submit an `{"outcome": "APPROVED"}` payload.
*   **Mitigation**:
    *   The API endpoint MUST strictly validate the caller's JWT against the assigned Roles or User IDs stored in the `ApprovalStep`'s active state in the database.
    *   If the user's role does not match, the API must return a `403 Forbidden` and log a security alert.

### 2.2 The "Tenant Admin" Bypass
*   **The Attack**: A user with the `Tenant_Admin` role attempts to approve a workflow assigned to `ROLE_LEGAL_COUNSEL`, arguing that "admins can do anything."
*   **Risk**: This violates separation of duties (Segregation of Duties - SoD). An IT Admin should not be able to legally approve a contract just because they have system access.
*   **Mitigation**:
    *   **Strict Enforcement**: The system must enforce the RBAC assignment strictly. A `Tenant_Admin` cannot approve a step unless they explicitly also hold the required business role.
    *   **Emergency Override**: If a true emergency requires an admin override, it must be performed via a dedicated `POST /api/workflows/approvals/{id}/override` endpoint. This endpoint requires extreme auditing, forces the admin to type a justification, and immediately alerts the original assignees and the compliance team that an override occurred.

### 2.3 Database Manipulation (The "DBA Bypass")
*   **The Attack**: A malicious internal employee (e.g., a BirthHub360 SRE or Database Admin) directly connects to the RDS PostgreSQL instance and updates the `workflow_runs` table, changing the state from `PAUSED_FOR_APPROVAL` to `RUNNING` and injecting `{"outcome": "APPROVED"}` into the payload.
*   **Risk**: Total subversion of application-layer security.
*   **Mitigation**:
    *   This is the hardest vector to prevent technically.
    *   **Detection**: Implement database-level trigger auditing (pgAudit). If the `workflow_runs` row is updated outside of the standard ORM application context (e.g., via a direct `psql` shell), an alert is triggered in the SIEM.
    *   **Irrefutability Check**: The orchestrator worker, upon waking up to resume the workflow, should verify that a corresponding, digitally signed (or securely hashed) audit record exists in the `workflow_audit_log` table before actually executing the next step. If the DB was manually updated, the audit log will likely be missing or logically inconsistent.

## 3. Conclusion
Approval bypass via the API is mitigated by strict, layered RBAC checks that do not default to "allow" for Tenant Admins. Bypass via direct database manipulation cannot be strictly prevented but MUST be reliably detected through external audit trails and application-level consistency checks upon workflow resumption.
