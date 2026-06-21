#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEPLOY_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
BACKUP_ROOT=${BACKUP_ROOT:-"$DEPLOY_DIR/backups"}
BACKUP_STAMP=${BACKUP_STAMP:-$(date -u +%Y%m%dT%H%M%SZ)}
OUT_DIR="$BACKUP_ROOT/postgres"
OUT_FILE="$OUT_DIR/rinana-postgres-$BACKUP_STAMP.dump"

mkdir -p "$OUT_DIR"
cd "$DEPLOY_DIR"

if [ -z "$(docker compose ps -q postgres)" ]; then
  echo "postgres service is not running" >&2
  exit 1
fi

docker compose exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c --no-owner --no-acl' \
  > "$OUT_FILE"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$OUT_FILE" > "$OUT_FILE.sha256"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$OUT_FILE" > "$OUT_FILE.sha256"
fi

echo "$OUT_FILE"
