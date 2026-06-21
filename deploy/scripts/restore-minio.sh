#!/usr/bin/env sh
set -eu

if [ $# -ne 1 ]; then
  echo "usage: $0 /path/to/rinana-minio-YYYYMMDDTHHMMSSZ" >&2
  exit 2
fi

BACKUP_DIR=$1
if [ ! -d "$BACKUP_DIR" ]; then
  echo "backup directory not found: $BACKUP_DIR" >&2
  exit 1
fi

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEPLOY_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
ENV_DIR="$DEPLOY_DIR/env"
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

case "$BACKUP_DIR" in
  /*) ABS_BACKUP_DIR=$BACKUP_DIR ;;
  *) ABS_BACKUP_DIR=$(CDPATH= cd -- "$BACKUP_DIR" && pwd) ;;
esac

cd "$DEPLOY_DIR"

MINIO_CONTAINER=$(docker compose ps -q minio)
if [ -z "$MINIO_CONTAINER" ]; then
  echo "minio service is not running" >&2
  exit 1
fi

docker run --rm \
  --network "container:$MINIO_CONTAINER" \
  -v "$ABS_BACKUP_DIR:/backup:ro" \
  -e MINIO_ROOT_USER="$MINIO_ROOT_USER" \
  -e MINIO_ROOT_PASSWORD="$MINIO_ROOT_PASSWORD" \
  -e MINIO_BUCKET="$MINIO_BUCKET" \
  "$MC_IMAGE" sh -c \
  'mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null &&
   mc mb --ignore-existing "local/$MINIO_BUCKET" >/dev/null &&
   if [ -d "/backup/$MINIO_BUCKET" ]; then
     mc mirror --overwrite "/backup/$MINIO_BUCKET" "local/$MINIO_BUCKET";
   else
     mc mirror --overwrite "/backup" "local/$MINIO_BUCKET";
   fi'

echo "restored minio bucket $MINIO_BUCKET from $ABS_BACKUP_DIR"
