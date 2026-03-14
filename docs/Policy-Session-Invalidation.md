# Policy: Active Session Invalidation

## Overview
This policy defines the required actions regarding active user sessions when critical security settings are modified. It ensures that potentially compromised sessions are terminated when a user attempts to secure their account.

## Trigger Events

The following actions performed by a user or an administrator MUST trigger an immediate session invalidation protocol:

1.  **Password Change:** The user successfully changes their password.
2.  **Password Reset:** The user successfully resets their password via a recovery link.
3.  **MFA Enablement:** The user turns on Multi-Factor Authentication (TOTP, WebAuthn, etc.).
4.  **MFA Disablement:** The user turns off Multi-Factor Authentication.
5.  **MFA Method Modification:** The user adds or removes a specific MFA device.
6.  **Role/Permission Change:** An administrator changes the assigned role or permissions of the user.
7.  **Account Suspension:** An administrator suspends or disables the user account.

## Required Actions

When a Trigger Event occurs, the system must execute the following:

1.  **Current Session Preservation (Optional but Recommended):**
    *   If the user initiates the action (e.g., password change), the specific session where the action was performed *may* remain active to provide a seamless UX. However, all *other* concurrent sessions must be terminated.
    *   *Strict Mode:* Terminate ALL sessions, including the current one, forcing an immediate re-login with the new credentials. This is the safest approach.
2.  **Global Invalidation:**
    *   All active session tokens (session cookies) stored in the database or cache associated with the user ID must be marked as invalid or deleted.
3.  **Refresh Token Revocation:**
    *   All active Refresh Tokens associated with the user must be immediately revoked. This prevents an attacker holding a valid refresh token from generating new access tokens.
4.  **WebSocket/Long-Polling Disconnection:**
    *   Any active, persistent connections (e.g., WebSockets for real-time updates) must be forcefully closed.

## Implementation Notes
*   This mechanism requires a centralized way to track and invalidate sessions. If using JWTs for stateless sessions, a "token blocklist" or an "issued before" timestamp check in the database must be implemented to reject validly signed but revoked JWTs.
