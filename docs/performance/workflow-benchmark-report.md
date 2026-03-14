# Workflow Engine Benchmark Report

This report details the maximum throughput and degradation points of the BirthHub360 stateful workflow engine under simulated peak load.

## 1. Methodology
*   **Infrastructure**: Production-equivalent ECS cluster (4 Worker nodes, 4 vCPU, 8GB RAM each) backed by an RDS PostgreSQL `db.r6g.2xlarge` instance.
*   **Load Generator**: `k6` injecting webhook triggers.
*   **Workload**: A standard 5-step workflow (1 Trigger, 2 Fast ActionSteps [mocked API], 1 ConditionStep, 1 Checkpoint).

## 2. Benchmark Results

### 2.1 Ingestion Throughput (API Gateway -> Broker)
*   **Peak Throughput**: 1,200 requests per second (RPS).
*   **Degradation Point**: At ~1,350 RPS, API Gateway latency begins to spike > 200ms, and the Redis broker memory utilization exceeds 80%.

### 2.2 Execution Throughput (Worker Processing)
*   **Peak Throughput**: 450 workflows completed per second.
*   **Degradation Point**: At ~500 completions/second, the PostgreSQL database hits a write IOPS bottleneck. The "Engine Overhead" latency (time to commit step state) degrades from ~40ms to > 300ms.

### 2.3 Concurrent Paused Workflows
*   **Peak**: 250,000 active, paused workflows (e.g., waiting for approvals or timers).
*   **Degradation Point**: Negligible compute impact. Database size grew by ~25GB. The degradation occurs at the "wake up" event if > 5,000 timers expire in the exact same millisecond, causing a temporary spike in the worker queue.

## 3. Conclusions
The current architecture safely supports **400 completed workflows per second** globally. To scale beyond this, the bottleneck is the relational database IOPS required for state checkpointing. Future scaling will require moving from standard EBS volumes to io2 Block Express, or implementing an asynchronous write-behind cache for state updates.
