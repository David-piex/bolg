#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEPLOY_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
ENV_DIR="$DEPLOY_DIR/env"
BACKUP_ROOT=${BACKUP_ROOT:-"$DEPLOY_DIR/backups"}
BACKUP_STAMP=${BACKUP_STAMP:-$(date -u +%Y%m%dT%H%M%SZ)}
MC_IMAGE=${MC_IMAGE:-minio/mc:RELEASE.2025-04-16T18-13-26Z}

set -a
[ -f "$ENV_DIR/minio.env" ] && . "$ENV_DIR/minio.env"
[ -f "$ENV_DIR/backend.env" ] && . "$ENV_DIR/backend.env"
set +a

MINIO_BUCKET=${MINIO_BUCKET:-rinana-media}
MINIO_ROOT_USER=${MINIO_ROOT_USER:-${MINIO_ACCESS_KEY:-}}
MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD:-${MINIO_SECRET_KEY:-}}

if [ -z "$MINIO_ROOT_USER" ] || [ -z "$MINIO_ROOT_PASSWORD" ]; then
  echo "missing MinIO credentials in deploy/env/minio.env or deploy/env/backend.env" >&2
  exit 1
fi

OUT_DIR="$BACKUP_ROOT/minio/rinana-minio-$BACKUP_STAMP"
mkdir -p "$OUT_DIR"
cd "$DEPLOY_DIR"

MINIO_CONTAINER=$(docker compose ps -q minio)
if [ -z "$MINIO_CONTAINER" ]; then
  echo "minio service is not running" >&2
  exit 1
fi

docker run --rm \
  --network "container:$MINIO_CONTAINER" \
  -v "$OUT_DIR:/backup" \
  -e MINIO_ROOT_USER="$MINIO_ROOT_USER" \
  -e MINIO_ROOT_PASSWORD="$MINIO_ROOT_PASSWORD" \
  -e MINIO_BUCKET="$MINIO_BUCKET" \
  "$MC_IMAGE" sh -c \
  'mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null &&
   mc mirror --overwrite "local/$MINIO_BUCKET" "/backup/$MINIO_BUCKET"' >&2

find "$OUT_DIR/$MINIO_BUCKET" -type f | sort > "$OUT_DIR/manifest.txt"
OBJECT_COUNT=$(find "$OUT_DIR/$MINIO_BUCKET" -type f 2>/dev/null | wc -l | tr -d ' ')

{
  echo "stamp=$BACKUP_STAMP"
  echo "bucket=$MINIO_BUCKET"
  echo "object_count=$OBJECT_COUNT"
  echo "created_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$OUT_DIR/summary.txt"

echo "$OUT_DIR"
