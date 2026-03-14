# Service Level Agreements (SLAs) for Approvals

To ensure business processes do not stall indefinitely while waiting for human input, BirthHub360 enforces default Service Level Agreements (SLAs) for different classes of workflow approvals.

## 1. Classification Matrix

Approvals are classified by the workflow designer based on the downstream impact of the decision.

| Criticality Tier | Downstream Action Examples | Default SLA | Max SLA | Escelation Path |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 0: Critical** | System-wide config changes, bulk data deletion | 1 Hour | 4 Hours | Auto-Reject + PagerDuty Alert |
| **Tier 1: Financial** | Issuing refunds, authorizing discounts > 20%, signing contracts | 4 Hours | 24 Hours | Route to Director level |
| **Tier 2: External Comms** | Approving an AI-drafted email to a VIP client, publishing a post | 24 Hours | 48 Hours | Auto-Reject (Do not send) |
| **Tier 3: Internal** | Lead reassignment, updating internal CRM fields | 3 Days | 7 Days | Auto-Approve (Proceed) |

## 2. SLA Monitoring and Notifications

*   **T-50% Warning**: When 50% of the SLA time has elapsed without a decision, the system sends an automated reminder notification (e.g., a "Bump" in Slack or an email reminder) to the assigned approver(s).
*   **T-90% Urgent Warning**: When 90% of the SLA has elapsed, an urgent notification is sent.
*   **T-100% Breach (Timeout)**: The SLA is breached. The `ApprovalStep` forcefully resolves with the `TIMEOUT` outcome.

## 3. SLA Calculation (Business Hours vs Calendar Hours)
*   By default, SLAs are calculated in **Calendar Hours** (24/7). A 4-hour SLA triggered at 10 PM on a Friday expires at 2 AM on Saturday.
*   **Future Enhancement**: Support for "Business Hours" SLAs, allowing a workflow to pause the SLA countdown over weekends and holidays based on the tenant's configured timezone.

## 4. SLA Reporting
Tenant administrators have access to an "Approval Bottlenecks" dashboard, which aggregates data from the `workflow_audit_log` to show:
1.  Average time-to-decision per role or user.
2.  Percentage of approvals resulting in a `TIMEOUT` (SLA breach).
3.  The specific workflow templates generating the most SLA breaches.
