# Risk Analysis: Privilege Escalation

## Overview
This document analyzes the vectors through which a user with lower privileges (e.g., `VIEWER`, `SDR`) could manipulate the system to gain higher privileges (e.g., `ADMIN`) or perform actions outside their authorized scope.

## Vectors for Escalation

### 1. Mass Assignment (Over-posting)
*   **Description:** When creating or updating a resource (like a User profile), the API blindly accepts and saves all fields provided in the JSON payload, including protected fields.
*   **Escalation Scenario:** A `VIEWER` updates their own profile via `PUT /api/v1/users/me`. They include `"role": "ADMIN"` in the JSON body. If the backend does not filter this input, the user promotes themselves.
*   **Mitigation:** Strict schema validation using Zod. Update schemas *must explicitly omit or forbid* fields like `role`, `permissions`, `tenantId`, or `planId` for non-administrative endpoints.

### 2. Insecure Direct Object Reference (IDOR) / Broken Object Level Authorization (BOLA)
*   **Description:** The system checks if the user is authenticated, but fails to check if the user is authorized to access the *specific* object requested by its ID.
*   **Escalation Scenario:** An `AE` is allowed to read contracts (`GET /api/v1/contracts/:id`). They change the `:id` to a contract belonging to a completely different tenant.
*   **Mitigation:** Every data access layer (Repository) must enforce `tenantId` binding. See `enforceTenantBinding` middleware and ensure Repositories always include `where: { id: requestedId, tenantId: currentUserTenant }`.

### 3. JWT Manipulation
*   **Description:** An attacker alters the payload of their JWT (e.g., changing their role inside the token) and the server accepts it.
*   **Escalation Scenario:** An attacker decodes their JWT, changes `"role": "SDR"` to `"role": "ADMIN"`, and sends the request.
*   **Mitigation:** Ensure JWTs are cryptographically signed using a strong algorithm (e.g., HS256 or RS256) and a securely stored secret. The server must reject any token with an invalid signature.

### 4. Admin Endpoint Exposure
*   **Description:** Administrative endpoints (e.g., changing a user's role) are not properly protected by role guards.
*   **Escalation Scenario:** An `SDR` discovers the `/api/v1/users/:id/role` endpoint and calls it to grant themselves `ADMIN` access.
*   **Mitigation:** Implement strict `requireRoles(['ADMIN'])` middleware on all endpoints that modify user permissions, billing, or tenant-wide settings.

### 5. Cross-Tenant Privilege Escalation
*   **Description:** A user who is an `ADMIN` in "Tenant A" exploits a vulnerability to perform actions in "Tenant B" where they are not an Admin.
*   **Mitigation:** The authentication context must strictly bind the session to a specific `tenantId` upon login. All authorization checks must validate the user's role *within the context of that specific tenant*.

## Continuous Monitoring
*   Audit logs must track all changes to user roles and permissions, flagging the `agentId` (who made the change).
*   Alerting should trigger immediately if a non-admin attempts to access an admin-only endpoint multiple times (potential probing).
