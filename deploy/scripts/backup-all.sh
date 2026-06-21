#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BACKUP_STAMP=${BACKUP_STAMP:-$(date -u +%Y%m%dT%H%M%SZ)}
export BACKUP_STAMP

"$SCRIPT_DIR/backup-postgres.sh"
"$SCRIPT_DIR/backup-minio.sh"
