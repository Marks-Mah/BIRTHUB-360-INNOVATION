#!/usr/bin/env bash
set -euo pipefail

docker compose up -d postgres redis
pnpm db:generate
pnpm db:reset
pnpm db:seed
