# Performance Acceptance Criteria: Workflow Engine

This document defines the baseline performance metrics that the workflow engine must sustain to pass automated load testing (`pnpm test:load`) and be considered production-ready.

## 1. Engine Latency (Overhead)
"Engine Overhead" is defined as the time the orchestrator takes to transition between two steps (e.g., the time from when `Step 1` finishes to when `Step 2` begins executing), excluding the actual execution time of the step itself (which relies on external APIs).

*   **[ ] Criterion 1.1**: The p95 Engine Overhead must be **< 150ms**.
*   **[ ] Criterion 1.2**: The p99 Engine Overhead must be **< 500ms** under normal load.
*   *Rationale*: Workflows should feel instantaneous to the end-user. If the orchestrator takes 2 seconds just to write state to the database and pop the next queue item, a 10-step workflow incurs 20 seconds of pure platform lag.

## 2. Webhook Ingestion
*   **[ ] Criterion 2.1**: The `webhook-receiver` endpoint must respond with an HTTP `202 Accepted` (or appropriate 4xx) within **< 100ms** at the p99 percentile.
*   **[ ] Criterion 2.2**: The system must sustain a throughput of **500 webhooks/second** globally without dropping a single payload.

## 3. Scale and Concurrency
*   **[ ] Criterion 3.1**: The system must successfully process **10,000 concurrently active runs** across all tenants without crashing or exhausting the database connection pool.
*   **[ ] Criterion 3.2**: Worker Auto-scaling must trigger and spin up new pods within **3 minutes** when the "Pending Task Queue" depth exceeds 1,000 items.

## 4. Tenant Isolation (Throttling)
*   **[ ] Criterion 4.1**: If Tenant A triggers 10,000 runs simultaneously (a spike), the queueing mechanism must ensure that Tenant B's workflows are not starved. Tenant B's runs must begin execution within **< 2 seconds** of triggering, even while Tenant A is artificially rate-limited to their plan's max concurrency limit.

## 5. Storage / Database IOPS
*   **[ ] Criterion 5.1**: Checkpointing the state (JSON payload + step ID) to the `workflow_runs` table must consume minimal write IOPS. Payloads > 500KB must be offloaded to blob storage (e.g., S3) with only a reference URL stored in the RDS row to prevent database bloat and vacuuming degradation.
