# Policy: E2E Test Suite Execution Frequency

To balance developer velocity (fast CI pipelines) with platform stability (exhaustive regression testing), BirthHub360 implements a tiered execution frequency for End-to-End (E2E) workflow tests.

## 1. The Pre-Merge Suite (Fast CI)
*   **Trigger**: Automatically executed on every commit pushed to an open Pull Request targeting the `main` branch.
*   **Scope**: Runs the `pnpm test:e2e:smoke` suite.
*   **Content**: Contains only the most critical, deterministic tests. It tests the core engine transitions (e.g., parsing a workflow, executing a basic Action, passing a Condition). It strictly uses Mock APIs (VCR) and does not hit the live internet or live LLMs.
*   **Time Budget**: Must complete in **< 5 minutes**.
*   **Requirement**: A required status check. A PR cannot be merged if this suite fails.

## 2. The Nightly Suite (Exhaustive E2E)
*   **Trigger**: Scheduled via GitHub Actions to run every night at 02:00 UTC.
*   **Scope**: Runs the full `pnpm test:e2e` suite against a newly provisioned, ephemeral Staging environment.
*   **Content**:
    *   Executes all complex templates (e.g., the 3 use cases defined in Phase 6.6).
    *   **Live Mode**: Bypasses VCR/Mocks and hits real sandbox environments for third-party providers (Stripe, GitHub, Hubspot).
    *   **Live LLMs**: Executes real API calls to OpenAI/Anthropic to test agent stability against slight model drift.
*   **Time Budget**: Up to **45 minutes**.
*   **Requirement**: Does not block PRs directly, but if the Nightly fails, it automatically opens a high-priority GitHub Issue assigned to the platform team. The main branch is considered "frozen" for releases until the Nightly is green again.

## 3. The Release Candidate (RC) Suite
*   **Trigger**: Manually triggered by DevOps prior to a production deployment.
*   **Scope**: Runs the Nightly Suite + the Load Testing Suite (`pnpm test:load`).
*   **Requirement**: Must be 100% green before the Docker images are tagged as `latest` and pushed to the production ECS clusters.
