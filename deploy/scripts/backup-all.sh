#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEPLOY_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
BACKUP_ROOT=${BACKUP_ROOT:-"$DEPLOY_DIR/backups"}
BACKUP_STAMP=${BACKUP_STAMP:-$(date -u +%Y%m%dT%H%M%SZ)}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-14}
BACKUP_PRUNE=${BACKUP_PRUNE:-1}
export BACKUP_STAMP
export BACKUP_ROOT

mkdir -p "$BACKUP_ROOT"

if command -v flock >/dev/null 2>&1 && [ "${RINANA_BACKUP_LOCKED:-0}" != "1" ]; then
  exec env RINANA_BACKUP_LOCKED=1 flock -n "$BACKUP_ROOT/.backup.lock" sh "$0" "$@"
fi

POSTGRES_BACKUP=$("$SCRIPT_DIR/backup-postgres.sh")
MINIO_BACKUP=$("$SCRIPT_DIR/backup-minio.sh")

MANIFEST_DIR="$BACKUP_ROOT/manifests"
MANIFEST_FILE="$MANIFEST_DIR/rinana-backup-$BACKUP_STAMP.txt"
mkdir -p "$MANIFEST_DIR"

{
  echo "stamp=$BACKUP_STAMP"
  echo "created_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "backup_root=$BACKUP_ROOT"
  echo "postgres_backup=$POSTGRES_BACKUP"
  echo "minio_backup=$MINIO_BACKUP"
  [ -f "$POSTGRES_BACKUP.sha256" ] && echo "postgres_sha256=$POSTGRES_BACKUP.sha256"
  [ -f "$MINIO_BACKUP/manifest.txt" ] && echo "minio_manifest=$MINIO_BACKUP/manifest.txt"
} > "$MANIFEST_FILE"

if [ "$BACKUP_PRUNE" = "1" ]; then
  case "$BACKUP_ROOT" in
    ""|"/"|"/tmp"|"/var"|"/mnt")
      echo "refusing to prune unsafe BACKUP_ROOT=$BACKUP_ROOT" >&2
      ;;
    *)
      find "$BACKUP_ROOT/postgres" -type f -name 'rinana-postgres-*.dump' -mtime +"$BACKUP_RETENTION_DAYS" -delete 2>/dev/null || true
      find "$BACKUP_ROOT/postgres" -type f -name 'rinana-postgres-*.dump.sha256' -mtime +"$BACKUP_RETENTION_DAYS" -delete 2>/dev/null || true
      find "$BACKUP_ROOT/minio" -mindepth 1 -maxdepth 1 -type d -name 'rinana-minio-*' -mtime +"$BACKUP_RETENTION_DAYS" -exec rm -rf {} + 2>/dev/null || true
      find "$MANIFEST_DIR" -type f -name 'rinana-backup-*.txt' -mtime +"$BACKUP_RETENTION_DAYS" -delete 2>/dev/null || true
      ;;
  esac
fi

echo "$MANIFEST_FILE"
