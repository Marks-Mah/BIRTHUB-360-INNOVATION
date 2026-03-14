#!/usr/bin/env bash
set -euo pipefail

pnpm install --frozen-lockfile
pnpm --filter @birthub/api-gateway lint
pnpm --filter @birthub/api-gateway test
pnpm --filter @birthub/api-gateway test:contract
pytest tests/integration
