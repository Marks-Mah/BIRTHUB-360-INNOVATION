# Workflow Approvals Policy

This policy governs the use of the `ApprovalStep` within BirthHub360 workflows, defining the authorization models, notification channels, and expiration behaviors for human-in-the-loop interactions.

## 1. Approval Assignment Models
When an `ApprovalStep` is configured, it must explicitly define *who* is authorized to approve or reject the request. BirthHub360 supports the following assignment models:

*   **Role-Based (Recommended)**: The approval is assigned to a specific RBAC role (e.g., `ROLE_SALES_MANAGER`). *Any* active user holding that role within the tenant can claim and resolve the approval. First to claim, wins.
*   **User-Based (Specific)**: The approval is assigned to a specific user's email address or ID. Only that user can resolve it.
*   **Dynamic Assignment**: The assignee is resolved at runtime using a variable from the workflow payload (e.g., `$.trigger.account_owner_email`).

## 2. Notification Channels
When a workflow enters an `ApprovalStep`, the system must notify the assignee(s).
*   **Default**: In-app notification (bell icon in the dashboard) and an automated email containing a summary and a deep-link to the approval UI.
*   **Optional**: Slack/Teams direct message integration (if configured by the tenant).

## 3. Maximum Deadlines & Expiration
Approvals cannot pause workflows indefinitely. Every `ApprovalStep` MUST configure an expiration timeout.

### 3.1 Expiration Limits by Action Type
Workflow designers must adhere to the following maximum allowed deadlines based on the criticality of the action blocked by the approval:

| Action Blocked by Approval | Max Allowed Deadline | Default Timeout |
| :--- | :--- | :--- |
| External Email / Comms | 48 hours | 24 hours |
| Data Deletion / Archival | 72 hours | 48 hours |
| Financial Transaction / Refund | 24 hours | 12 hours |
| Contract Generation | 7 days | 48 hours |
| Routine Internal State Change | 30 days | 7 days |

### 3.2 Timeout Behavior
If the deadline is reached without a human decision:
1.  The `ApprovalStep` automatically resolves with an outcome of `TIMEOUT`.
2.  The workflow resumes execution.
3.  **Mandatory**: The workflow *must* define an `OnTimeout` logic branch to handle the escalation (e.g., auto-rejecting the request and notifying the original requester, or escalating the approval to a higher-tier manager).

## 4. Irrefutability and Audit
*   All approval decisions (`APPROVED`, `REJECTED`, `TIMEOUT`) are permanently logged in the `workflow_audit_log` table.
*   The log must capture: The User ID of the decider, the exact UTC timestamp, the IP address (if resolved via UI), and any textual justification/comment provided by the user at the time of the decision.
*   Once recorded, an approval decision cannot be altered or deleted, even by a Tenant Admin.
