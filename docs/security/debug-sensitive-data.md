# Security Analysis: Debugging UI and Sensitive Data

This document defines the security boundaries for the BirthHub360 Workflow Debugging UI. Because debugging inherently requires deep visibility into execution state, it poses a significant risk of data leakage if not strictly controlled.

## 1. The Cross-Tenant Data Leakage Risk (6.5.J5)
*   **The Threat**: Can an administrator of Tenant A use the Debug UI to view the payload, variables, or error messages belonging to a workflow executed by Tenant B?
*   **Analysis**: In a Shared Schema with Row-Level Security (RLS) architecture (ADR-008), this risk exists if the API serving the Debug UI fails to correctly apply the tenant context.
*   **Mitigation Mechanism**:
    *   The `GET /api/workflows/runs/{run_id}/debug` endpoint MUST strictly extract the `tenant_id` from the caller's JWT.
    *   The database query fetching the checkpoint state MUST include `WHERE tenant_id = :tenant_id`.
    *   *Conclusion*: If RLS and API tenant scoping are correctly implemented, cross-tenant leakage via the debug UI is mathematically impossible at the database layer.

## 2. Intra-Tenant Sensitive Data Exposure (6.5.J3)
Even within the correct tenant, certain data is too sensitive to be displayed in plaintext in the Debug UI, even to a `Tenant_Admin`.

### 2.1 Explicitly Banned Data Types (Blacklist)
The following data must **never** appear in the Debug UI, under any circumstances. The backend must redact these fields before sending the JSON state to the frontend:

1.  **Platform Secrets**:
    *   BirthHub360 Internal JWTs or service-to-service API keys.
    *   Database connection strings.
2.  **Authentication Material**:
    *   Passwords (even hashed).
    *   OAuth Access/Refresh Tokens for external integrations (e.g., the raw Slack bot token). *Note: The UI should show "Slack Integration [Configured]", not the token itself.*
3.  **Payment Data (PCI-DSS)**:
    *   Full Credit Card PANs (Primary Account Numbers).
    *   CVV/CVC codes.

### 2.2 Configurable Masking (Tenant-Defined)
Because BirthHub360 processes arbitrary JSON payloads, the system cannot automatically know what a tenant considers "sensitive" (e.g., one tenant might consider `salary` sensitive, another might not).

*   **Mechanism**: The workflow template designer must support a "Mask Variable" toggle for any variable defined in the payload schema.
*   **Behavior**: If a variable (e.g., `$.payload.patient_ssn`) is marked as masked:
    *   The orchestrator processes the actual value during execution (e.g., sending it to an API).
    *   However, when the state is serialized for the Debug UI, the value is replaced with `********`.
    *   This ensures that Support Ops can debug the flow (e.g., seeing that the API failed) without seeing the underlying PII.

## 3. Implementation Rules for the Debug API
*   **Rule 1**: The backend API is solely responsible for redaction. The frontend UI must never be trusted to hide data via CSS or conditional rendering. If it shouldn't be seen, it shouldn't be sent over the wire.
*   **Rule 2**: Redaction logic must apply recursively to nested JSON objects and arrays within the execution payload.
