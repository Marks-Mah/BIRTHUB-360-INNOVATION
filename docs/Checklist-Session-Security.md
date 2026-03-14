# Checklist: Session Security

Based on the OWASP Session Management Cheat Sheet, this checklist must be verified before releasing any changes to the authentication or session management flows.

## Session ID Properties
- [ ] **Sufficient Length:** Session ID is at least 128 bits (16 bytes) long.
- [ ] **High Entropy:** Session ID is generated using a cryptographically secure pseudo-random number generator (CSPRNG).
- [ ] **Meaningless:** Session ID does not contain any meaningful data (e.g., user ID, roles, IP address).

## Cookie Security Attributes
- [ ] **`Secure` flag:** Set to `true` to ensure the cookie is only transmitted over HTTPS.
- [ ] **`HttpOnly` flag:** Set to `true` to prevent client-side JavaScript from accessing the cookie (mitigates XSS).
- [ ] **`SameSite` attribute:** Set to `Lax` or `Strict` to provide protection against Cross-Site Request Forgery (CSRF).
- [ ] **`Path` attribute:** Restrict the cookie to the minimum necessary path.
- [ ] **`Domain` attribute:** Ensure the cookie is scoped to the exact domain and not overly broad subdomains unless strictly required.

## Session Lifecycle Management
- [ ] **Regeneration on Login:** A new session ID is generated immediately after successful authentication.
- [ ] **Regeneration on Privilege Escalation:** A new session ID is generated if the user elevates their privileges (e.g., sudo mode).
- [ ] **Invalidation on Logout:** The session is explicitly destroyed on the server-side, and the cookie is cleared on the client-side upon user logout.
- [ ] **Idle Timeout:** Enforced server-side idle timeout (e.g., 30 minutes of inactivity).
- [ ] **Absolute Timeout:** Enforced server-side absolute timeout (e.g., 12 hours), regardless of activity.

## Session Tracking and Anomaly Detection
- [ ] **Concurrent Session Limits:** Enforce limits based on the user's role (see Policy-Concurrent-Sessions.md).
- [ ] **Device/IP Binding:** Detect and alert/require re-authentication if the session IP or user-agent changes drastically during an active session.
- [ ] **Visibility:** Users can view and selectively terminate active sessions from their security settings page.
