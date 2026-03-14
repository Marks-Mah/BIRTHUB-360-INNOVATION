# Load Testing Plan: Workflow Engine

This document outlines the methodology for load testing the BirthHub360 workflow engine to ensure it meets our scalability requirements and properly enforces tenant concurrency limits.

## 1. Objectives
1.  Verify that the Orchestrator can handle high-throughput webhook ingestion without dropping events.
2.  Validate that Worker nodes scale horizontally effectively based on queue depth.
3.  Confirm that Tenant Concurrency Limits (Max Parallel Runs) are strictly enforced to prevent "noisy neighbor" scenarios.
4.  Identify the bottleneck resource (e.g., Database CPU, Worker Memory, API Gateway connections) under sustained maximum load.

## 2. Tenant Concurrency Limits
Load testing must validate that the system throttles tenants according to their billing plan:

| Subscription Plan | Max Parallel Runs per Tenant | Max Enqueued Runs |
| :--- | :--- | :--- |
| **Free / Basic** | 5 | 50 |
| **Professional** | 20 | 500 |
| **Enterprise** | 100 (Customizable) | 5,000 |

*Behavior to Verify*: If a Basic tenant triggers 10 webhooks simultaneously, 5 should enter `RUNNING` state, and 5 should sit in `ENQUEUED` state until the first batch completes.

## 3. Test Scenarios

### Scenario A: The "Webhook Flood" (Ingress Test)
*   **Goal**: Test API Gateway and Webhook Receiver throughput.
*   **Method**: Use a load generation tool (e.g., K6, Artillery) to send 1,000 webhook POST requests per second to a single tenant's endpoint for 5 minutes.
*   **Expected Result**: The receiver accepts all valid payloads (returning HTTP 202) and places them in the Orchestrator's internal message broker (e.g., Redis/SQS). Zero dropped payloads.

### Scenario B: The "Compute Heavy" Workload
*   **Goal**: Test Worker auto-scaling and database connection pooling.
*   **Method**: Trigger 500 parallel workflows (spread across multiple Enterprise tenants) where each workflow consists of an `AgentStep` that performs a heavy summarization task, followed by 5 DB write steps.
*   **Expected Result**: Kubernetes Horizontal Pod Autoscaler (HPA) detects high CPU/Queue Depth and provisions new Worker pods. The database connection pool does not exhaust (no "too many clients" errors).

### Scenario C: The "Long Sleep" (State Persistence Test)
*   **Goal**: Verify that paused workflows do not consume active compute.
*   **Method**: Trigger 10,000 workflows that immediately enter a `WaitStep` for 24 hours.
*   **Expected Result**: Database size grows slightly to store the 10,000 checkpoints, but Worker CPU/Memory remains near zero. At the 24-hour mark, a controlled spike in CPU occurs as the orchestrator wakes up all 10,000 runs.

## 4. Environment and Tooling
*   **Environment**: Dedicated Staging/Load environment mirroring Production sizing (AWS ECS + RDS `db.r6g.xlarge`).
*   **Tooling**: `k6` for HTTP generation. Datadog for APM and Infrastructure monitoring.
*   **Execution**: Automated via a GitHub Actions pipeline (`pnpm test:load`) scheduled weekly on weekends.
