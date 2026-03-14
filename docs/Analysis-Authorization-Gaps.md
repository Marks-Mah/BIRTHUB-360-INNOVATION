# Analysis: Authorization Gaps

## Overview
This document analyzes the current state of our API Gateway routes to identify endpoints that are exposed to authenticated users but lack explicit Role-Based Access Control (RBAC) guards. An authenticated user (e.g., a simple `VIEWER`) might be able to execute these endpoints if they guess the URL and payload.

## Identified Gaps (Missing Role Guards)

The following endpoints currently rely only on `authenticateToken` but do not implement a `requireRoles` or `requirePermissions` middleware check.

### 1. General Analytics & Dashboards
*   **Endpoint:** `GET /api/v1/analytics/funnel`
*   **Endpoint:** `GET /api/v1/analytics/attribution`
*   **Risk:** Low/Medium. While read-only, these expose aggregate tenant performance. Currently, any authenticated user in the tenant can view this.
*   **Recommendation:** Add a `requireRoles(['ADMIN', 'HEAD_MARKETING', 'CMO', 'ANALYST'])` guard.

### 2. Financial Summaries
*   **Endpoint:** `GET /api/v1/financial/summary`
*   **Risk:** High. Exposes MRR, revenue, and cash flow data.
*   **Recommendation:** Add a strict `requireRoles(['ADMIN', 'FINANCIAL', 'CS_MANAGER'])` guard.

### 3. Customer Health & Insights
*   **Endpoint:** `GET /api/v1/customers`
*   **Risk:** Medium. Exposes client list and health scores.
*   **Recommendation:** Add `requireRoles(['ADMIN', 'CS_MANAGER', 'AE', 'VIEWER'])` (broad read access is usually okay, but should be explicitly declared).

### 4. Deal Proposal Generation
*   **Endpoint:** `POST /api/v1/deals/:id/proposal`
*   **Risk:** Medium. Can trigger external service calls (storage/LLM) and alter deal state.
*   **Recommendation:** Ensure this is explicitly guarded by `requireRoles(['ADMIN', 'AE'])`. While an AE creates proposals, an SDR or VIEWER should not be able to trigger this generation.

### 5. Contract Status Checks
*   **Endpoint:** `GET /api/v1/contracts/:id/status`
*   **Risk:** Low. Only exposes status string, but should still be explicitly mapped.
*   **Recommendation:** Explicitly add `requireRoles` matching the `Contracts -> Read` matrix.

## Action Plan
1.  Introduce a `requireRoles` middleware in `apps/api-gateway/src/middleware/authorization.ts`.
2.  Update `apps/api-gateway/src/routes/index.ts` and `apiV1Router` definitions to wrap the identified endpoints with the appropriate guards based on `docs/PERMISSIONS.md`.
3.  Write integration tests specifically attempting to access these endpoints with unauthorized tokens (e.g., a VIEWER trying to view the financial summary).
