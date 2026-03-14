# Infrastructure Cost Analysis: Cost Per Workflow Run

To ensure sustainable pricing and margin preservation, this document breaks down the pure infrastructure cost (AWS compute, database IOPS, bandwidth) of executing a single workflow run, categorized by step type.

*Note: This analysis excludes LLM API token costs (OpenAI/Anthropic), which are passed through to the tenant via Unidades de Execução (UE) as defined in `multi-agent-workflow-cost-analysis.md`.*

## 1. Baseline Cost (The Engine Tax)
Every workflow run, regardless of what it does, incurs a baseline cost just to exist.
*   **Database Storage**: A standard 5-step workflow creates ~5KB of state data. At $0.115/GB-month, storing this for the 30-day active retention period costs practically $0.0000005.
*   **Database IOPS**: 6 write operations (1 creation + 5 checkpoints). At ~$0.20 per million write requests, this is $0.0000012.
*   **Redis Queue Ops**: $0.0000001.
*   *Base Cost Estimate*: **~$0.000002 per run**.

## 2. Cost by Step Type

### 2.1 ActionStep (Internal DB Write)
*   **Compute**: Minimal (~5ms).
*   **IOPS**: 1 additional write.
*   *Marginal Cost*: **~$0.000001**

### 2.2 ActionStep (External Webhook)
*   **Compute (Idle Waiting)**: Holding a worker thread open for an average of 500ms. On an AWS Fargate container ($0.04/vCPU-hour), 500ms of "wait time" costs ~$0.000005.
*   **Egress Bandwidth**: Sending a 10KB JSON payload. AWS data transfer out ($0.09/GB) = $0.0000009.
*   *Marginal Cost*: **~$0.000006**

### 2.3 ConditionStep
*   **Compute (Active Processing)**: Evaluating a JSONPath expression is CPU intensive but fast (~2ms).
*   *Marginal Cost*: **~$0.0000005**

### 2.4 WaitStep / ApprovalStep
*   **Compute**: Zero while paused.
*   **Storage**: Minor penalty for sitting in the database longer, requiring the Polling Sweeper to scan past it.
*   *Marginal Cost*: **~$0.000001**

### 2.5 AgentStep
*   **Compute (Heavy)**: Running the LangGraph state machine, validating Pydantic models, parsing tool outputs. A complex agent execution can consume 2 seconds of raw CPU time (excluding API wait time).
*   *Marginal Cost*: **~$0.00002** (Compute only, ignores LLM token cost).

## 3. Summary
The pure infrastructure cost of running workflows is exceptionally low (fractions of a cent per run).

**Example: A 10-step workflow (1 Trigger, 3 Conditions, 5 Webhooks, 1 Wait)**
*   Base: $0.000002
*   Conditions: $0.0000015
*   Webhooks: $0.00003
*   Wait: $0.000001
*   **Total Hard Cost: ~$0.0000345 per run** (approx. $0.34 per 10,000 runs).

*Conclusion*: The platform's profit margin is protected. The primary cost drivers are LLM API fees and third-party data enrichment tools, which are appropriately metered and billed to the tenant. The only infrastructure risk is unbounded egress bandwidth from highly iterative ActionSteps.
