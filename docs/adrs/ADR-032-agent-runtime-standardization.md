# ADR-032: Agent Runtime Standardization

- Status: Accepted
- Date: 2026-03-16

## Context

The platform accumulated three parallel execution paths for agents:

1. TypeScript marketplace manifests and installed-agent lifecycle in the main product.
2. A BullMQ worker path with workflow orchestration and generic tool execution.
3. Python/LangGraph role agents living beside the core platform.

That split made governance, observability, approvals, memory, policies and rollout harder because the control plane and the execution plane were no longer the same system.

## Decision

The authoritative runtime for installed agents is now `TS-first`, manifest-native and executed by the platform worker.

The supported production path is:

1. catalog manifest,
2. installed agent record,
3. worker runtime,
4. governed output artifact,
5. approval and metrics pipeline.

Python agents remain supported only as external providers behind an explicit contract boundary. They are no longer treated as the default runtime path for first-party installed agents.

## Consequences

Positive:

- One runtime for policies, memory, output governance, metrics and budget controls.
- One queueing and retry model for manual runs and workflow-triggered runs.
- Easier rollout, alerting and operational support.
- Faster product iteration because manifest changes map directly to runtime behavior.

Trade-offs:

- The worker/runtime in TypeScript becomes a critical path and needs stronger operational hardening.
- Python capabilities must be wrapped as providers or connectors instead of bypassing the platform runtime.
- Existing Python-only execution flows require migration planning.

## Python Provider Contract

When Python execution is still needed, it must satisfy all of the following:

- Receive a signed execution request from the TS control plane.
- Return normalized output, logs, cost and approval hints.
- Respect tenant, policy and timeout envelopes issued by the TS runtime.
- Publish artifacts and approvals back through platform APIs instead of writing side-state.
- Expose health and version metadata for rollout control.

## Migration Direction

- New first-party agents: manifest-native in TS.
- Existing Python agents: wrap as providers where justified.
- Legacy Python flows without clear ownership: deprecate after equivalent TS runtime coverage exists.
