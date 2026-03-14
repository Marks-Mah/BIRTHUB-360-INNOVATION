#!/usr/bin/env bash
set -euo pipefail

if ! command -v corepack >/dev/null 2>&1; then
  echo "corepack is required to bootstrap pnpm automatically."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to start postgres and redis."
  exit 1
fi

corepack enable >/dev/null 2>&1 || true

pnpm install --frozen-lockfile
docker compose up -d postgres redis
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev
