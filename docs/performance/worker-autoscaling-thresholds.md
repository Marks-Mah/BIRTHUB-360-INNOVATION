# Worker Autoscaling Criteria and Thresholds

BirthHub360 relies on Kubernetes Horizontal Pod Autoscaler (HPA) combined with KEDA (Kubernetes Event-driven Autoscaling) to dynamically scale the workflow worker fleet based on demand.

## 1. Scaling Metrics

We do *not* scale solely based on CPU utilization. A worker blocked waiting for an external HTTP response uses 0% CPU but is still 100% occupied. Therefore, we scale primarily based on **Queue Depth**.

1.  **Queue Depth (Primary)**: The number of workflow tasks sitting in the Redis broker waiting to be picked up by a worker.
2.  **CPU Utilization (Secondary)**: Used as a fallback and to detect runaway `ConditionStep` loops.

## 2. Thresholds and Behavior

### 2.1 Scale-Out (Upscaling)
*   **Threshold**: `Queue Depth per Worker > 10`
*   **Evaluation Window**: 30 seconds.
*   **Action**: Add Pods to bring the ratio back below 10.
*   **Maximum Pods**: 50 (Hard ceiling to prevent accidental bankruptcy or catastrophic database connection exhaustion).
*   *Example*: If there are 4 workers, they can comfortably handle 40 pending tasks. If the queue jumps to 100 tasks, KEDA will instantly request 6 additional workers (Total: 10).

### 2.2 Scale-In (Downscaling)
*   **Threshold**: `Queue Depth per Worker = 0` AND `CPU < 20%`.
*   **Evaluation Window**: 5 minutes (Stabilization window).
*   **Action**: Gradually terminate idle pods.
*   **Minimum Pods**: 2 (High availability baseline across multiple Availability Zones).
*   *Note*: Downscaling must gracefully drain active connections. A pod receiving a termination signal (SIGTERM) must finish its currently executing step, checkpoint the state, and then exit. It must not accept new tasks from the queue during shutdown.
