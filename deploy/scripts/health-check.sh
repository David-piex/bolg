#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEPLOY_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
SITE_URL=${SITE_URL:-http://127.0.0.1/zh}
API_URL=${API_URL:-http://127.0.0.1/api/auth/me}
MEDIA_PATH=${MEDIA_PATH:-}
FAILED=0

check() {
  name=$1
  shift
  if "$@"; then
    echo "ok: $name"
  else
    echo "fail: $name" >&2
    FAILED=1
  fi
}

cd "$DEPLOY_DIR"

check "docker compose config" docker compose config --quiet
check "postgres container" sh -c 'test -n "$(docker compose ps -q postgres)"'
check "backend container" sh -c 'test -n "$(docker compose ps -q backend)"'
check "frontend container" sh -c 'test -n "$(docker compose ps -q frontend)"'
check "nginx container" sh -c 'test -n "$(docker compose ps -q nginx)"'
check "minio container" sh -c 'test -n "$(docker compose ps -q minio)"'

check "postgres ready" docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
check "site responds" curl -fsSIL --max-time 10 "$SITE_URL"

# /api/auth/me should be reachable; 401/403 is acceptable without a login.
if curl -fsSI --max-time 10 "$API_URL" >/dev/null 2>&1; then
  echo "ok: api responds"
else
  API_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL" || true)
  case "$API_STATUS" in
    401|403) echo "ok: api responds with auth gate $API_STATUS" ;;
    *) echo "fail: api responds status $API_STATUS" >&2; FAILED=1 ;;
  esac
fi

if [ -n "$MEDIA_PATH" ]; then
  check "media range" curl -fsSI --max-time 10 -H "Range: bytes=0-1023" "$MEDIA_PATH"
fi

exit "$FAILED"
