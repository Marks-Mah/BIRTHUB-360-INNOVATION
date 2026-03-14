#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL não definido" >&2
  exit 1
fi

BACKUP_DIR=${BACKUP_DIR:-./backups}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/birthub_${TIMESTAMP}.dump"

pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --file "$FILE"
echo "Backup salvo em: $FILE"
