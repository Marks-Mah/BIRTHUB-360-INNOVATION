# Guide: Customizing Workflow Templates

This guide provides best practices for tenant administrators on how to customize pre-built BirthHub360 Workflow Templates to fit their specific business needs without breaking upgrade paths or creating unmaintainable logic.

## 1. The Template Cloning Model
When you install a Template from the Marketplace, BirthHub360 creates a **detached clone** of that template in your tenant environment.
*   **What this means**: You own the copy. Any changes you make will not affect the global template.
*   **The Catch**: Because it is detached, if the original publisher releases "Version 2.0" of the template, your customized version will *not* automatically inherit the updates. (See ADR-023 for details on upgrading).

## 2. Best Practices for Customization

### 2.1 Use Sub-Workflows for Core Logic
If a template contains a complex piece of logic (e.g., a 10-step Lead Scoring algorithm), and you want to use that scoring algorithm but change what happens *afterward*:
*   **Don't**: Modify the 10 steps directly within the main workflow.
*   **Do**: Extract the 10 steps into a separate, standalone workflow called "Sub: Lead Scoring". Replace those 10 steps in the main workflow with a single `Call_Sub_Workflow` step.
*   **Why**: This encapsulates the core logic, making the main workflow easier to read and modify.

### 2.2 Standardize Your Payload Schema
Templates often expect specific variable names (e.g., `$.trigger.customer_email`).
*   **If your trigger is different**: If you are using a custom webhook instead of the default Hubspot trigger, your payload might look like `$.trigger.user_email_address`.
*   **The Fix**: Do not go through the entire template changing every reference from `customer_email` to `user_email_address`. Instead, add a "Data Mapping" `ActionStep` at the very beginning of the workflow to normalize your input to match the template's expected schema.

### 2.3 Leave `AgentSteps` Intact (Modify Prompts Carefully)
Agent steps are finely tuned. If you need the agent to behave differently:
*   **Prefer System Prompts**: Adjust the `system_prompt` variables passed into the agent step rather than trying to swap out the underlying agent completely.
*   **Don't Change the Schema**: Do not change the JSON Schema of the output expected from the agent, as downstream condition steps are likely hardcoded to expect exactly those keys.

### 2.4 Use the "OnFailure" Branches
Templates are built with "Happy Paths". When customizing:
*   Always check what happens if an API call you added fails.
*   Add an `OnFailure` branch to your custom steps to route errors to a Slack notification channel or email, so you aren't surprised when a modified workflow silently fails and goes to the DLQ.

## 3. Naming Conventions
When you customize a template, rename it immediately to indicate it has diverged from the baseline:
*   *Original*: `High-Risk Churn Intervention (v1.0)`
*   *Customized*: `[ACME] High-Risk Churn Intervention - US Region`

This helps your team identify which workflows are standard and which contain proprietary company logic.
