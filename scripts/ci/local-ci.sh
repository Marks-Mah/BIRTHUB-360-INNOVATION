#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
TARGET="${1:-full}"

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

if ! command -v node >/dev/null 2>&1; then
  echo "[local-ci] node is not available in PATH. Bootstrap a local runtime first."
  exit 1
fi

if [[ "$TARGET" == "full" ]]; then
  echo "[local-ci] >>> node scripts/ci/full.mjs full"
  node scripts/ci/full.mjs full
else
  echo "[local-ci] >>> node scripts/ci/full.mjs task $TARGET"
  node scripts/ci/full.mjs task "$TARGET"
fi
