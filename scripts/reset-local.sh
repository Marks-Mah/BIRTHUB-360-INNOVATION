#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRISMA_BIN="$ROOT_DIR/packages/database/node_modules/.bin/prisma"

if [[ "${OS:-}" == "Windows_NT" ]]; then
  PRISMA_BIN="$ROOT_DIR/packages/database/node_modules/.bin/prisma.CMD"
fi

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgrespassword@localhost:5432/birthub_cycle2}"

start_ts="$(date +%s)"

"$PRISMA_BIN" generate --schema "$ROOT_DIR/packages/database/prisma/schema.prisma"
"$PRISMA_BIN" migrate reset --schema "$ROOT_DIR/packages/database/prisma/schema.prisma" --force --skip-generate
"$PRISMA_BIN" db seed --schema "$ROOT_DIR/packages/database/prisma/schema.prisma"

end_ts="$(date +%s)"
elapsed="$((end_ts - start_ts))"

printf 'reset-local concluido em %ss\n' "$elapsed"
