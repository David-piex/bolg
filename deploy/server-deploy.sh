#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="$PROJECT_ROOT/deploy"
ENV_DIR="$DEPLOY_DIR/env"
CERT_DIR="$DEPLOY_DIR/certs"

server_ip="${SERVER_IP:-$(hostname -I 2>/dev/null | awk '{print $1}')}"
if [ -z "${server_ip}" ]; then
  server_ip="127.0.0.1"
fi
site_domain="${SITE_DOMAIN:-lingnaive520.uk}"
media_domain="${MEDIA_DOMAIN:-}"
minio_public_endpoint="${MINIO_PUBLIC_ENDPOINT:-http://${server_ip}:9000}"
if [ -n "$site_domain" ]; then
  minio_public_endpoint="https://${site_domain}"
fi
if [ -n "$media_domain" ]; then
  minio_public_endpoint="https://${media_domain}"
fi

random_secret() {
  openssl rand -base64 36 | tr -d '\n'
}

random_password() {
  openssl rand -hex 12
}

write_if_missing() {
  local path="$1"
  local content="$2"
  if [ ! -f "$path" ]; then
    printf '%s\n' "$content" > "$path"
    chmod 600 "$path"
  fi
}

backend_env_was_created=0

write_backend_env_if_missing() {
  local path="$1"
  local content="$2"
  if [ ! -f "$path" ]; then
    printf '%s\n' "$content" > "$path"
    chmod 600 "$path"
    backend_env_was_created=1
  fi
}

generate_origin_certificate_if_missing() {
  local cert_path="$CERT_DIR/origin.crt"
  local key_path="$CERT_DIR/origin.key"
  local openssl_config="$CERT_DIR/openssl-origin.cnf"
  local primary_name="${site_domain:-$server_ip}"

  mkdir -p "$CERT_DIR"
  chmod 700 "$CERT_DIR"

  if [ -f "$cert_path" ] && [ -f "$key_path" ]; then
    return
  fi

  cat > "$openssl_config" <<EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = ${primary_name}

[v3_req]
subjectAltName = DNS:${primary_name},DNS:www.${primary_name},DNS:media.${primary_name},IP:${server_ip}
EOF

  openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
    -keyout "$key_path" \
    -out "$cert_path" \
    -config "$openssl_config"

  chmod 600 "$cert_path" "$key_path" "$openssl_config"
}

install_docker_if_missing() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    return
  fi

  if ! command -v apt-get >/dev/null 2>&1; then
    echo "Docker is missing and this script only auto-installs on apt-based Linux." >&2
    exit 1
  fi

  apt-get update
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  . /etc/os-release
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
}

mkdir -p "$ENV_DIR"
generate_origin_certificate_if_missing

postgres_password="$(random_password)"
minio_secret="$(random_password)"
jwt_secret="$(random_secret)"
super_admin_password="$(random_password)"

write_if_missing "$ENV_DIR/postgres.env" "POSTGRES_DB=rinana
POSTGRES_USER=rinana
POSTGRES_PASSWORD=${postgres_password}"

write_if_missing "$ENV_DIR/minio.env" "MINIO_ROOT_USER=rinana_minio
MINIO_ROOT_PASSWORD=${minio_secret}"

if [ -f "$ENV_DIR/postgres.env" ]; then
  # shellcheck disable=SC1091
  . "$ENV_DIR/postgres.env"
fi

if [ -f "$ENV_DIR/minio.env" ]; then
  # shellcheck disable=SC1091
  . "$ENV_DIR/minio.env"
fi

write_backend_env_if_missing "$ENV_DIR/backend.env" "SERVER_PORT=8080
MAX_UPLOAD_FILE_SIZE=512MB
MAX_UPLOAD_REQUEST_SIZE=512MB
DATABASE_URL=jdbc:postgresql://postgres:5432/${POSTGRES_DB:-rinana}
DATABASE_USERNAME=${POSTGRES_USER:-rinana}
DATABASE_PASSWORD=${POSTGRES_PASSWORD:-$postgres_password}
SPRING_DATA_REDIS_HOST=redis
SPRING_DATA_REDIS_PORT=6379
MINIO_ENDPOINT=http://minio:9000
MINIO_PUBLIC_ENDPOINT=${minio_public_endpoint}
MINIO_ACCESS_KEY=${MINIO_ROOT_USER:-rinana_minio}
MINIO_SECRET_KEY=${MINIO_ROOT_PASSWORD:-$minio_secret}
MINIO_BUCKET=rinana-media
MINIO_REGION=us-east-1
JWT_SECRET=${jwt_secret}
SUPER_ADMIN_USERNAME=admin
SUPER_ADMIN_EMAIL=admin@rinana.local
SUPER_ADMIN_PASSWORD=${super_admin_password}
SUPER_ADMIN_DISPLAY_NAME=站长"

write_if_missing "$ENV_DIR/frontend.env" "NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_RINANA_DEMO_MODE=disabled
RINANA_API_PROXY_TARGET=http://backend:8080"

install_docker_if_missing

cd "$DEPLOY_DIR"
docker compose up -d postgres redis minio

if docker volume inspect deploy_postgres-data >/dev/null 2>&1; then
  for _ in $(seq 1 60); do
    if docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done

  docker compose exec -T postgres sh -ceu 'sql_literal() { printf "'\''%s'\''" "$(printf '\''%s'\'' "$1" | sed "s/'\''/'\'''\''/g")"; }; sql_identifier() { printf '\''"%s"'\'' "$(printf '\''%s'\'' "$1" | sed '\''s/"/""/g'\'')"; }; psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v db_user="$(sql_identifier "$POSTGRES_USER")" -v db_pass="$(sql_literal "$POSTGRES_PASSWORD")" <<'"'"'SQL'"'"'
ALTER USER :db_user WITH PASSWORD :db_pass;
SQL'

  if [ "$backend_env_was_created" = "1" ]; then
    # When a persisted database outlives regenerated env files, the existing
    # super admin keeps its old password. Sync it once so the generated
    # backend.env remains a usable recovery credential.
    # shellcheck disable=SC1091
    . "$ENV_DIR/backend.env"
    docker compose exec -T postgres sh -ceu 'sql_literal() { printf "'\''%s'\''" "$(printf '\''%s'\'' "$1" | sed "s/'\''/'\'''\''/g")"; }; psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v admin_user="$(sql_literal "$1")" -v admin_email="$(sql_literal "$2")" -v admin_name="$(sql_literal "$3")" -v admin_password="$(sql_literal "$4")" <<'"'"'SQL'"'"'
CREATE EXTENSION IF NOT EXISTS pgcrypto;
UPDATE users
SET username = :admin_user,
    email = :admin_email,
    display_name = :admin_name,
    password_hash = crypt(:admin_password, gen_salt('bf')),
    member_level = 'DIAMOND',
    status = 'ACTIVE',
    updated_at = now()
WHERE role = 'SUPER_ADMIN';
SQL' sh "$SUPER_ADMIN_USERNAME" "$SUPER_ADMIN_EMAIL" "$SUPER_ADMIN_DISPLAY_NAME" "$SUPER_ADMIN_PASSWORD"
  fi
fi

docker compose up -d --build
docker compose ps

echo
echo "Site: http://${server_ip}/zh"
echo "Admin login: http://${server_ip}/zh/login"
echo "MinIO console: http://${server_ip}:9001"
echo "Super admin username: admin"
echo "Super admin email: admin@rinana.local"
echo "Super admin password is stored in ${ENV_DIR}/backend.env"
