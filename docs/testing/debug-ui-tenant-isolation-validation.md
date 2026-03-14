# Validation Report: Debug UI Tenant Isolation

## 1. The Validation Goal
To mathematically and practically prove that the Workflow Debug UI cannot be used to leak workflow state data (payloads, variables, error messages) across tenant boundaries.

## 2. Architecture Review
As defined in ADR-008, BirthHub360 utilizes a Shared Schema with Row-Level Security (RLS) PostgreSQL database.

*   The table `workflow_runs` stores the JSON payloads required by the Debug UI.
*   The RLS policy on this table is: `CREATE POLICY tenant_isolation_policy ON workflow_runs USING (tenant_id = current_setting('app.current_tenant_id')::uuid);`

## 3. Test Cases Performed

### Test Case 1: Direct IDOR Attempt
*   **Action**: Authenticated as Admin of Tenant A. Discovered a valid `run_id` belonging to Tenant B. Made a direct `GET /api/workflows/runs/{tenant_B_run_id}/debug` API call.
*   **Expected**: HTTP 404 Not Found (or 403 Forbidden).
*   **Result**: PASS. The database driver automatically appends the `app.current_tenant_id` session variable based on Tenant A's JWT. The query `SELECT * FROM workflow_runs WHERE id = {tenant_B_run_id}` returns 0 rows. The API correctly responds with a 404.

### Test Case 2: List Runs Enumeration
*   **Action**: Authenticated as Admin of Tenant A. Called the list endpoint `GET /api/workflows/runs`.
*   **Expected**: Only runs belonging to Tenant A are returned.
*   **Result**: PASS. The RLS policy successfully filters out all rows where `tenant_id` != Tenant A.

### Test Case 3: The "Super Admin" UI
*   **Action**: Authenticated as an internal BirthHub360 `System_Admin`. Attempted to use the standard tenant-facing Debug UI to view a customer's workflow run.
*   **Expected**: Failure. The standard UI must enforce tenant constraints even for internal users.
*   **Result**: PASS. The internal admin must use a specialized, heavily audited "Break Glass" internal tool to view tenant data; the standard public API correctly rejects their request because their JWT lacks a specific `tenant_id`.

## 4. Conclusion
The combination of API-level JWT validation and PostgreSQL Row-Level Security successfully guarantees tenant isolation for the Workflow Debug UI. The risk of cross-tenant data leakage is mitigated.
