# Validation Report: Approval Policy Bypass Protection

## 1. The Validation Goal
To confirm that the `ApprovalStep` cannot be bypassed, spoofed, or manipulated by unauthorized users, ensuring the integrity of the workflow's human-in-the-loop governance.

## 2. Test Cases Performed

### Test Case 1: Insufficient Privilege API Call
*   **Action**: A user with the role `Sales_Rep` attempts to call `POST /api/workflows/approvals/{id}/resolve` with `{"outcome": "APPROVED"}` for an approval explicitly assigned to the `Sales_Manager` role.
*   **Expected**: HTTP 403 Forbidden. The run state must remain `PAUSED_FOR_APPROVAL`.
*   **Result**: PASS. The API controller successfully verified the JWT roles array against the `ApprovalStep` configuration.

### Test Case 2: The "Tenant Admin" Override
*   **Action**: A user with `Tenant_Admin` (but NOT `Sales_Manager`) attempts to use the standard resolve endpoint.
*   **Expected**: HTTP 403 Forbidden (as defined in the Threat Model).
*   **Result**: PASS. The system forces admins to adhere to SoD (Segregation of Duties).

### Test Case 3: Replay Attack on Approval Endpoint
*   **Action**: An attacker captures the HTTP POST request of a legitimate manager approving a request. The attacker attempts to replay that exact request (including the JWT) 5 minutes later on a *different* approval ID.
*   **Expected**: HTTP 401/403 or 400.
*   **Result**: PASS. The payload signature is tied to the specific `run_id` and `step_id`. Furthermore, if they replay it against the *same* ID, the system returns a `409 Conflict` because the approval state is already `RESOLVED` (Optimistic Locking test passed).

### Test Case 4: Email Link Manipulation (CSRF/Phishing)
*   **Action**: A user clicks an approval link in an email that was tampered with to change the `outcome` query parameter from `REJECT` to `APPROVE`.
*   **Expected**: The system does not immediately execute the approval.
*   **Result**: PASS. As per the Phishing Risk Analysis, the email link only opens the UI. The user must visually confirm the action and click a button in the authenticated SPA (Single Page Application), which includes an anti-CSRF token in the subsequent POST request.

## 3. Conclusion
The implementation of the `ApprovalStep` successfully defends against unauthorized bypass, API manipulation, and email-based phishing attacks. The audit trail captures all relevant identity data securely.
