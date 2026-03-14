#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL não definido" >&2
  exit 1
fi

if [[ $# -ne 1 ]]; then
  echo "Uso: $0 <arquivo.dump>" >&2
  exit 1
fi

DUMP_FILE="$1"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$DATABASE_URL" "$DUMP_FILE"
echo "Restore concluído de: $DUMP_FILE"
