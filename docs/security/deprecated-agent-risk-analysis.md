# Risk Analysis: Templates with Deprecated Agent Steps

## 1. Context
BirthHub360 agents (published in "Packs") evolve over time. Occasionally, an agent version is marked as **DEPRECATED** (e.g., due to the underlying LLM model being retired by OpenAI/Anthropic, or a critical security flaw found in the agent's toolset).
However, tenants may have installed workflow templates months or years ago that explicitly reference these now-deprecated agent versions in an `AgentStep`.

## 2. Threat & Risk Identification

### 2.1 Execution Failure (Availability Risk)
*   **The Risk**: If an underlying LLM provider completely turns off a model (e.g., `gpt-3.5-turbo-0301`) that a deprecated agent hardcodes, any workflow attempting to execute that `AgentStep` will immediately crash with a 4xx provider error.
*   **Impact**: Critical business processes (e.g., lead routing, automated support) halt without warning, causing SLA breaches and data backlog in the DLQ.

### 2.2 Security Vulnerabilities (Integrity Risk)
*   **The Risk**: An agent was deprecated because a prompt injection vulnerability was discovered in its reasoning loop, allowing attackers to exfiltrate data via its tools.
*   **Impact**: Tenants continuing to run workflows with the deprecated agent remain actively vulnerable to attack, even if a patched version of the agent exists in the marketplace.

### 2.3 Drift and Unpredictability
*   **The Risk**: Even if the LLM model isn't turned off, the provider might change the model's behavior under the hood, causing the deprecated agent's rigidly defined prompts to produce hallucinations or malformed JSON that breaks downstream `ConditionSteps`.

## 3. Mitigation Strategies & Policies

### 3.1 The "Grace Period" Policy
When an agent version is marked `DEPRECATED`, it does not immediately stop working.
*   A **Sunset Date** (e.g., 90 days from deprecation) is established.
*   During this period, the platform will emit `WARNING` level logs and UI banners, but the agent will continue to execute.

### 3.2 Aggressive Notification
*   The orchestrator runs a daily cron job identifying all active `WorkflowDefinitions` containing an `AgentStep` that references a deprecated agent.
*   Targeted emails are sent to the `Tenant_Admin` stating: "URGENT: Workflow '[Workflow Name]' relies on Agent '[Agent Name v1.0]' which will stop functioning on [Sunset Date]. Update required."

### 3.3 The "Hard Stop" Enforcement
On the Sunset Date, the status of the agent version changes from `DEPRECATED` to `RETIRED`.
*   **Action**: The orchestrator will actively refuse to execute a `RETIRED` agent.
*   **Behavior**: When a workflow run reaches the step, it will immediately transition the run to `FAILED_AGENT_RETIRED` and move it to the DLQ. It will *not* attempt to call the LLM provider, saving costs and preventing undefined behavior.

### 3.4 Why Not Auto-Upgrade?
We **do not** automatically upgrade an `AgentStep` from `v1.0` to `v2.0` to avoid the retirement crash.
*   *Why?* Agent outputs are non-deterministic. Version 2.0 might return a slightly different JSON structure or evaluate risk differently. Auto-upgrading an agent silently changes the business logic of the tenant's workflow, which violates the immutable execution contract defined in ADR-023. The tenant must explicitly opt-in to the new agent version and test it.
