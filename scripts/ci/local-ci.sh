#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

: "${DATABASE_URL:=postgresql://postgres:postgrespassword@localhost:5432/birthub_cycle1}"
: "${REDIS_URL:=redis://localhost:6379}"
: "${API_CORS_ORIGINS:=http://localhost:3001}"
: "${API_PORT:=3000}"
: "${NEXT_PUBLIC_API_URL:=http://localhost:3000}"
: "${NEXT_PUBLIC_APP_URL:=http://localhost:3001}"
: "${NEXT_PUBLIC_ENVIRONMENT:=ci-local}"
: "${NODE_ENV:=test}"
: "${QUEUE_NAME:=birthub-cycle1}"
: "${SESSION_SECRET:=ci-local-secret}"
: "${WEB_BASE_URL:=http://localhost:3001}"

export DATABASE_URL REDIS_URL API_CORS_ORIGINS API_PORT NEXT_PUBLIC_API_URL NEXT_PUBLIC_APP_URL
export NEXT_PUBLIC_ENVIRONMENT NODE_ENV QUEUE_NAME SESSION_SECRET WEB_BASE_URL

run_step() {
  local label="$1"
  shift
  echo "\n[local-ci] >>> ${label}"
  "$@"
}

run_step "install" pnpm install --frozen-lockfile
run_step "db:generate" pnpm db:generate
run_step "build" pnpm build
run_step "lint" pnpm lint
run_step "typecheck" pnpm typecheck
run_step "test" pnpm test

if [[ "${RUN_E2E:-0}" == "1" ]]; then
  run_step "test:e2e" pnpm test:e2e
else
  echo "\n[local-ci] >>> test:e2e skipped (set RUN_E2E=1 to include)"
fi
