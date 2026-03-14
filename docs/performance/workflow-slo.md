# Workflow Engine Service Level Objectives (SLOs)

This document establishes the Service Level Objectives (SLOs) for the BirthHub360 Workflow Engine, setting clear expectations for availability and latency based on the tenant's subscription plan.

## 1. Engine Availability SLO
"Availability" is defined as the percentage of valid webhook triggers that successfully enter the orchestrator queue and transition to a `RUNNING` state without a 5xx platform error.

*   **Enterprise Plan**: 99.99% (Allowed downtime: ~4.3 minutes/month)
*   **Professional Plan**: 99.9% (Allowed downtime: ~43 minutes/month)
*   **Free/Basic Plan**: 99.5% (Allowed downtime: ~3.6 hours/month)

*Note: A failure in a third-party API called by a workflow step does NOT count against the Engine Availability SLO, as it is outside BirthHub360's control.*

## 2. Execution Latency (Overhead) SLO
"Latency Overhead" is defined as the platform-induced delay between two consecutive steps in a workflow (i.e., the Checkpointing Tax + Queue Processing time). It excludes the time spent executing user-defined HTTP calls or LLM generations.

*   **Enterprise Plan**: p99 < 150ms
*   **Professional Plan**: p95 < 300ms
*   **Free/Basic Plan**: p90 < 1000ms (1 second)

*Note: During periods of extreme platform congestion, the orchestrator will prioritize enqueuing and processing Enterprise and Professional tier workflow steps over Basic tier workflows to maintain the higher SLA commitments.*

## 3. SLA Breach Penalties
As outlined in the Master Service Agreement (MSA), failure to meet the Enterprise 99.99% Availability SLO in a given calendar month entitles the tenant to service credits:
*   99.0% - 99.98%: 10% credit of monthly base fee.
*   < 99.0%: 30% credit of monthly base fee.
