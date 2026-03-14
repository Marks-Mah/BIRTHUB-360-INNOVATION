# Risk Analysis: Phishing and Email-Based Approvals

## 1. Threat Definition
To reduce friction, some workflow systems allow users to approve or reject requests directly by clicking a link embedded in an email (e.g., "Click here to Approve"). This introduces a severe security vulnerability: Phishing and CSRF (Cross-Site Request Forgery).

*   **The Attack**: An attacker crafts a malicious email that looks identical to a BirthHub360 approval notification. Or, an attacker embeds a hidden image tag (`<img src="https://birthhub360.com/api/approve/123">`) in a different, seemingly benign email. If the authorized user's email client auto-loads images or they click the malicious link while possessing an active browser session, the action is executed without their explicit consent.

## 2. BirthHub360 Security Posture
**Decision**: BirthHub360 strictly **prohibits "One-Click" state-changing actions directly from email links.**

### 2.1 Mitigation: The "Deep Link to UI" Pattern
1.  **Email Content**: The email notification contains details about the request, but the buttons ("Approve" / "Reject") are *not* direct API calls.
2.  **Navigation**: Clicking the button opens a browser tab and deep-links the user to the specific `Approval Task` page within the secure BirthHub360 web application.
3.  **Authentication**: If the user is not logged in, they are forced through the SSO/IdP flow.
4.  **Explicit Action**: Once authenticated and viewing the request details in the UI, the user must explicitly click a primary UI button (e.g., "Confirm Approval") to execute the state change.
5.  **CSRF Protection**: The UI form submission is protected by standard CSRF tokens (or SameSite cookie attributes) enforced by the frontend framework.

### 2.2 Exceptional Case: "Magic Link" Approvals (Not Recommended)
If a future requirement demands "no login required" approvals for external vendors (users without a BirthHub360 account):
*   **Implementation**: The email must contain a cryptographically secure, single-use, time-bound JWT embedded in the URL (a "Magic Link").
*   **Security Control**: Visiting the Magic Link *still* must not immediately change the state via a GET request. It must render a minimal webpage requiring the external user to click a "Confirm" button (a POST request) to prevent email scanner bots from accidentally approving requests by simply pre-fetching the URLs.

## 3. Conclusion
By decoupling the notification mechanism (email) from the state-mutation mechanism (authenticated UI POST request), BirthHub360 eliminates the risk of zero-click email phishing and CSRF attacks targeting critical workflow approvals.
