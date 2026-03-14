# Engine Bottleneck Analysis by Step Type

This document analyzes where the workflow orchestrator loses the most time (latency) during the execution of different step types. This data is used to prioritize performance optimizations.

## 1. The Checkpointing Tax (Global Bottleneck)
Every step transition incurs a "Checkpointing Tax".
*   **Action**: Serialization of the JSON payload and a database `UPDATE` or `INSERT`.
*   **Cost**: ~30ms - 50ms per step.
*   **Impact**: In a 10-step workflow, database I/O alone accounts for up to 0.5 seconds of execution time.

## 2. Bottlenecks by Step Type

### 2.1 ActionStep (HTTP Webhooks)
*   **Primary Bottleneck**: Network Latency and External DNS Resolution.
*   **Analysis**: The engine is completely blocked waiting for the external provider to respond. If a user configures an endpoint on a slow, shared hosting server, the worker thread is held hostage.
*   **Mitigation**: Aggressive thread-pooling and strict 30-second hard timeouts.

### 2.2 AgentStep (LangGraph Execution)
*   **Primary Bottleneck**: LLM Provider TTFT (Time to First Token) and Generation Time.
*   **Analysis**: An `AgentStep` is by far the slowest component. A GPT-4o call can take 2-10 seconds. Furthermore, the `StateGraph` compilation and context loading (hydrating the agent's memory) adds ~200ms of pure compute overhead before the network call even begins.
*   **Mitigation**: Streaming responses (where applicable) and caching identical prompt/state pairs.

### 2.3 ConditionStep (Logic Evaluation)
*   **Primary Bottleneck**: JSONPath parsing and Dynamic Type Coercion.
*   **Analysis**: Compiling JSONPath queries against large (1MB+) nested JSON payloads to evaluate an `If/Else` rule consumes significant CPU cycles and creates garbage collection pressure in the worker runtime.
*   **Mitigation**: Pre-compile JSONPath expressions when the workflow template is saved, rather than evaluating them from scratch on every run.

### 2.4 WaitStep / ApprovalStep
*   **Primary Bottleneck**: The Polling Sweeper.
*   **Analysis**: These steps take near-zero time to *enter*, but "waking them up" relies on a cron-like sweeper querying the database for expired timers. If the `workflow_runs` table lacks proper indexing on the `resume_at` column, this query becomes a slow sequential scan.
*   **Mitigation**: Ensure `idx_workflow_runs_resume_at` is heavily optimized and vacuumed frequently.
