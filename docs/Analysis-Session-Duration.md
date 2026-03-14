# Analysis: Session Duration by Plan and Risk Assessment

## Overview
This document analyzes the ideal session durations for different subscription plans and evaluates the security risks associated with long-lived sessions.

## Session Duration by Plan

### Starter Plan
*   **Idle Timeout:** 2 hours
*   **Absolute Timeout:** 24 hours
*   **Rationale:** Starter plan users typically perform sporadic tasks. A moderate idle timeout balances convenience with baseline security.

### Pro Plan
*   **Idle Timeout:** 1 hour
*   **Absolute Timeout:** 12 hours
*   **Rationale:** Pro users handle more sensitive data and often use the platform in professional environments. Shorter timeouts mitigate risks from unattended devices.

### Enterprise Plan
*   **Idle Timeout:** Configurable (Default: 30 minutes)
*   **Absolute Timeout:** Configurable (Default: 8 hours)
*   **Rationale:** Enterprise environments demand strict security controls. Administrators must have the ability to enforce tight session limits aligned with their internal compliance policies.

## Risks of Long Sessions

1.  **Session Hijacking:** If an attacker steals a session cookie (e.g., via XSS or physical access to an unlocked machine), a longer absolute timeout gives them a larger window of opportunity to exploit the account.
2.  **Unattended Devices:** In corporate environments, users often leave workstations unlocked. Long idle timeouts increase the likelihood that an unauthorized person can access the active session.
3.  **Delayed Revocation:** If a user's permissions are revoked or their account is compromised, a long-lived session might remain active until it expires naturally, bypassing the revocation.
4.  **Stale State:** Long sessions might cache outdated authorization data, leading to inconsistencies if roles or permissions change dynamically.

## Mitigations
*   Implement strict idle timeouts alongside absolute timeouts.
*   Require re-authentication (or step-up authentication) for highly sensitive actions, regardless of session age.
*   Provide users with a clear interface to view and terminate active sessions across all devices.
