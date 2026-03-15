# Platform Hardening Readiness - 2026-03-15

- Status: `Azul`
- Scope date: `2026-03-15`
- Official source of truth: `CHECKLIST_MASTER.md`

## Green-by-evidence implementation work

- `6.8.C3`, `6.8.C5`, `6.10.C1`, `6.10.C2`, `6.10.C4` now have executable workflow evidence wired into the repo.
- `7.9.C1` through `7.9.C4`, `7.10.C1` and `7.10.C3` are now reconciled against the billing coverage report and dedicated E2E specs.
- `apps/api-gateway` now enforces Zod validation on `POST /api/v1/leads`, returns structured `400` errors and logs lead creation with the shared logger.
- `apps/voice-engine` now has explicit env validation plus health and websocket contract coverage.
- `apps/agent-orchestrator` now documents the hybrid runtime through executable TS/Python tests and exposes `/health`.
- `apps/webhook-receiver` keeps `main.py` as canonical runtime and has Python smoke coverage for `/health` and signed webhooks.
- The supported portion of the satellite lane is now executable through `lint:satellites`, `typecheck:satellites`, `test:satellites` and `build:satellites`.

## Executed evidence on this workstation

- `pnpm preflight:core`
- `pnpm --filter @birthub/api-gateway lint`
- `pnpm --filter @birthub/api-gateway test`
- `pnpm lint:workflows`
- `pnpm --filter @birthub/worker test -- src/engine/runner.workflow-chain.test.ts`
- `pnpm workflow:coverage`
- `pnpm test:billing:coverage`
- `pnpm --filter @birthub/voice-engine build`
- `pnpm lint:satellites`
- `pnpm typecheck:satellites`
- `pnpm test:satellites`
- `pnpm build:satellites`

## Generated artifacts

- `docs/evidence/workflow-coverage.md`
- `test-results/workflow-coverage.json`
- `docs/evidence/billing-coverage.md`
- `test-results/billing-coverage.json`

## Remaining blockers

- Python 3.12+ is not installed on this workstation, so `pnpm preflight:satellites` fails and the FastAPI smoke suites for `agent-orchestrator` and `webhook-receiver` were not executed here.
- The Playwright release suite was not executed in this pass, so the dedicated E2E specs for billing/workflow remain implemented but not locally replayed in this environment snapshot.
- Legacy debt outside the current hardening scope still blocks non-smoke gates in some satellites:
  - `apps/dashboard`: `lint`, `typecheck`, `build`
  - `apps/api-gateway`: `typecheck`, `build`
  - `apps/agent-orchestrator`: `lint`, `typecheck`, `build`

## Notes

- `apps/web`, `apps/api` and `apps/worker` remain the release-critical core lane.
- `apps/dashboard` is treated as a legacy surface in this phase and only participates in smoke validation.
- When docs and code diverged, the executable artifact or test was treated as the source of truth and the checklist was updated afterward.
