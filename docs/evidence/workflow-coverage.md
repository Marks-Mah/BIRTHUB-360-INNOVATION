# Workflow Coverage Report

- Generated at: 2026-03-17T03:32:38.321Z
- Required step types: 11
- Critical scenarios:
  - 6.8.C3 PASS - HTTP and email side-effects are mocked inside the automated workflow suite (apps/worker/src/engine/runner.workflow-chain.test.ts)
  - 6.10.C1 PASS - Workflow editor evidence test persists the 10-node canvas artifact path (tests/e2e/workflow-editor-evidence.spec.ts)
  - 6.10.C4 PASS - Workflow runs and agent output debugger are covered by a dedicated E2E flow (tests/e2e/workflow-agent-output.spec.ts)

## Step type coverage

- TRIGGER_WEBHOOK: packages\workflows-core\test\step-types.test.ts, apps\worker\src\engine\runner.db-integration.test.ts
- TRIGGER_CRON: packages\workflows-core\test\step-types.test.ts
- TRIGGER_EVENT: packages\workflows-core\test\step-types.test.ts
- HTTP_REQUEST: apps\worker\src\engine\runner.http.msw.test.ts, apps\worker\src\engine\runner.workflow-chain.test.ts
- CONDITION: packages\workflows-core\test\step-types.test.ts
- CODE: packages\workflows-core\test\step-types.test.ts
- TRANSFORMER: packages\workflows-core\test\step-types.test.ts
- SEND_NOTIFICATION: packages\workflows-core\test\step-types.test.ts, apps\worker\src\engine\runner.http.msw.test.ts, apps\worker\src\engine\runner.workflow-chain.test.ts
- AGENT_EXECUTE: packages\workflows-core\test\step-types.test.ts, apps\worker\src\engine\runner.agent.smoke.test.ts, apps\worker\src\engine\runner.db-integration.test.ts, apps\worker\src\engine\runner.workflow-chain.test.ts
- AI_TEXT_EXTRACT: packages\workflows-core\test\step-types.test.ts
- DELAY: packages\workflows-core\test\step-types.test.ts
