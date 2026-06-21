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
