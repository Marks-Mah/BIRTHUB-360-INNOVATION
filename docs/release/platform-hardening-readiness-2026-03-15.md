# Platform Hardening Readiness - 2026-03-15

- Status: `Azul`
- Scope date: `2026-03-15`
- Official source of truth: `CHECKLIST_MASTER.md`

## Green-by-evidence implementation work

- `apps/web`, `apps/api` and `apps/worker` are now enforced as the release-critical core lane through `pnpm ci:task core`.
- Supported satellites now run through a separate canonical lane, `pnpm ci:task satellites`.
- Workflow and billing hardening gates now generate executable evidence via `docs/evidence/workflow-coverage.md`, `docs/evidence/billing-coverage.md` and their JSON artifacts.
- `apps/api-gateway` now validates `POST /api/v1/leads` with Zod, returns structured `400` responses and uses the shared logger.
- `apps/voice-engine`, `apps/agent-orchestrator` and `apps/webhook-receiver` now have explicit smoke or contract coverage aligned with the supported satellite lane.
- `packages/agent-packs` now keep the maestro manifest aligned with the catalog contract under `packs:test`.
- Security hardening now has explicit route-guard verification and a generated report in `docs/security/security-coverage-report.md`.

## Executed evidence on this workstation

- `pnpm preflight:core`
- `pnpm preflight:satellites`
- `pnpm preflight:full`
- `pnpm smoke:satellites`
- `pnpm ci:task core`
- `pnpm ci:task satellites`
- `pnpm workflow:coverage`
- `pnpm test:billing:coverage`
- `pnpm security:guards`
- `pnpm --filter @birthub/api test`
- `pnpm packs:test`
- `pnpm test:e2e`
- `pnpm ci:full`
- `pnpm ci:legacy-agents`

## Generated artifacts

- `docs/evidence/workflow-coverage.md`
- `test-results/workflow-coverage.json`
- `docs/evidence/billing-coverage.md`
- `test-results/billing-coverage.json`
- `artifacts/workflows/workflow-editor-10-nodes.png`
- `docs/security/security-coverage-report.md`

## Current release-gate result

- `pnpm ci:task core`: PASS
- `pnpm ci:task satellites`: PASS
- `pnpm test:e2e`: PASS
- `pnpm ci:full`: PASS after removing the legacy Python agent suite from the canonical release gate and keeping it in a dedicated lane.
- `pnpm ci:legacy-agents`: PASS after restoring legacy prompts, schemas, tool exports and orchestrator compatibility routes.

## Remaining blockers outside the canonical release gate

- Legacy debt outside this hardening scope still blocks non-smoke gates in some supported or legacy surfaces:
  - `apps/dashboard`: `lint`, `typecheck`, `build`
  - `apps/api-gateway`: `typecheck`, `build`
  - `apps/agent-orchestrator`: `lint`, `typecheck`, `build`
- Next.js still emits a non-blocking `allowedDevOrigins` warning during Playwright runs against `127.0.0.1`.

## Notes

- `pnpm ci:full` is now the canonical release gate for the supported platform scope: core + supported satellites + packs + workflow/billing/security evidence + Playwright.
- `pnpm ci:legacy-agents` remains the explicit lane for the unsupported Python legacy agent stack, but it is green on this workstation snapshot.
- When docs and code diverged, the executable artifact or test result was treated as the source of truth and the checklist was updated afterward.
