#!/usr/bin/env sh
set -eu

if [ $# -ne 1 ]; then
  echo "usage: $0 /path/to/rinana-postgres-YYYYMMDDTHHMMSSZ.dump" >&2
  exit 2
fi

DUMP_FILE=$1
if [ ! -f "$DUMP_FILE" ]; then
  echo "dump file not found: $DUMP_FILE" >&2
  exit 1
fi

if [ ! -s "$DUMP_FILE" ]; then
  echo "dump file is empty: $DUMP_FILE" >&2
  exit 1
fi

if [ -f "$DUMP_FILE.sha256" ]; then
  if command -v sha256sum >/dev/null 2>&1; then
    (cd "$(dirname -- "$DUMP_FILE")" && sha256sum -c "$(basename -- "$DUMP_FILE").sha256")
  elif command -v shasum >/dev/null 2>&1; then
    (cd "$(dirname -- "$DUMP_FILE")" && shasum -a 256 -c "$(basename -- "$DUMP_FILE").sha256")
  else
    echo "sha256 sidecar exists but no checksum tool is available" >&2
    exit 1
  fi
fi

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEPLOY_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

cd "$DEPLOY_DIR"

if [ -z "$(docker compose ps -q postgres)" ]; then
  echo "postgres service is not running" >&2
  exit 1
fi

docker compose exec -T postgres sh -c \
  'pg_restore --clean --if-exists --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "$DUMP_FILE"

echo "restored postgres from $DUMP_FILE"
