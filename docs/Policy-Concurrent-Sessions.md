# Policy: Concurrent Sessions

## Overview
This policy defines the limits on concurrent active sessions per user, tailored by their assigned role within the platform.

## Rationale
Limiting concurrent sessions helps mitigate credential sharing, reduces the attack surface if credentials are compromised, and ensures accountability by tying actions to a specific, active device/session.

## Limits by Role

### General Users (Viewer, Analyst)
*   **Limit:** 3 concurrent sessions.
*   **Action on Exceeding:** When attempting to create a 4th session, the oldest active session is automatically terminated and invalidated to make room for the new one.

### Operational Roles (SDR, AE, CS_MANAGER, FINANCIAL, LEGAL)
*   **Limit:** 2 concurrent sessions.
*   **Action on Exceeding:** The user is prompted with a warning indicating they have reached their limit. They must choose an existing session to terminate before the new login can proceed.

### Administrative/Privileged Roles (ADMIN, CMO, HEAD_MARKETING)
*   **Limit:** 1 concurrent session.
*   **Action on Exceeding:** Attempting to log in from a new device/browser will immediately terminate any existing active session. This strict limit ensures that highly privileged accounts cannot be used simultaneously from multiple locations, significantly reducing the risk of a compromised administrative account being used stealthily in the background.

## Enforcement Mechanism
*   The authentication service must track active session tokens linked to the user ID.
*   Upon login, the system queries the active session count.
*   If the limit is reached, the system executes the defined action (auto-terminate oldest, prompt user, or strict override) based on the user's primary role.
