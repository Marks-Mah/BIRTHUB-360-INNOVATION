# Acceptance Criteria: Workflow Approval Functionality

To consider the `ApprovalStep` feature complete and ready for production, any implementation must satisfy the following strict criteria regarding auditability, irrefutability, and lifecycle management.

## 1. Auditability & Irrefutability
*   **[ ] Criterion 1.1**: Every state change of an approval task (e.g., Created, Claimed, Approved, Rejected, Expired) must generate a distinct, immutable event in the `workflow_audit_log` table.
*   **[ ] Criterion 1.2**: If a user approves/rejects a request, the audit log MUST capture their exact `user_id` (extracted from the authenticated session JWT), the timestamp, and their IP address. It must never say "Approved by System".
*   **[ ] Criterion 1.3**: The database schema must enforce that rows in `workflow_audit_log` cannot be UPDATE'd or DELETE'd by the application user. (Append-only).
*   **[ ] Criterion 1.4**: The UI must surface this audit trail. On the Workflow Run detail page, there must be a visible log stating: "Approved by [User Name] on [Date/Time] with comment: '[Optional Comment]'".

## 2. Expiration (Timeout) Handling
*   **[ ] Criterion 2.1**: The system must enforce that a workflow cannot remain in an `ApprovalStep` indefinitely. If the user does not specify a timeout, the engine must inject a default SLA (e.g., 7 days).
*   **[ ] Criterion 2.2**: The background worker (or scheduled cron) responsible for checking timeouts must process expiration events within +/- 1 minute of the scheduled deadline.
*   **[ ] Criterion 2.3**: When an approval expires, the orchestrator must automatically append the `TIMEOUT` outcome to the payload and attempt to route the workflow to the `OnTimeout` branch.

## 3. Concurrency and Race Conditions
*   **[ ] Criterion 3.1**: If an approval is assigned to a Role (e.g., 5 users can approve it), the system must handle the scenario where User A and User B click "Approve" at the exact same millisecond.
*   **[ ] Criterion 3.2**: The database transaction resolving the approval must use optimistic locking (e.g., a `version` column) or an atomic `UPDATE ... WHERE status = 'PENDING'` clause. The second user's request must safely fail with a "This request has already been resolved by another user" message, rather than crashing the workflow or causing dual-execution.

## 4. Security and Access Control
*   **[ ] Criterion 4.1**: Direct GET requests from email links must NEVER mutate the state (See Phishing Risk Analysis).
*   **[ ] Criterion 4.2**: The API must verify that the caller holds the role specified in the `ApprovalStep` definition. Attempting to resolve an approval without the correct role must return a 403.
