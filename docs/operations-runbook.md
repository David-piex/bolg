# Operations runbook

This project is designed for a single Linux VPS running Docker Compose from
`deploy/`. Keep MinIO private on the Docker network. Public traffic should enter
through Nginx and Cloudflare only.

## Upload limits

Keep these limits aligned:

- Frontend video validation: `95MB`
- Spring: `MAX_UPLOAD_FILE_SIZE=95MB`, `MAX_UPLOAD_REQUEST_SIZE=100MB`
- Nginx: `client_max_body_size 100m`

Cloudflare currently documents proxied request body limits as Free `100 MB`,
Pro `100 MB`, Business `200 MB`, and Enterprise `500 MB` by default. A `95MB`
application video limit leaves room for request overhead on Free/Pro. Do not
raise only Nginx/Spring above this when traffic is still proxied through
Cloudflare.

## Backups

Run from the project root on the server:

```bash
cd /opt/rinana
bash deploy/scripts/backup-all.sh
```

Default output:

- PostgreSQL: `deploy/backups/postgres/rinana-postgres-<timestamp>.dump`
- MinIO: `deploy/backups/minio/rinana-minio-<timestamp>/rinana-media/`

Use a different destination for mounted backup storage:

```bash
BACKUP_ROOT=/mnt/backups/rinana bash deploy/scripts/backup-all.sh
```

Suggested cron:

```cron
15 3 * * * cd /opt/rinana && BACKUP_ROOT=/mnt/backups/rinana bash deploy/scripts/backup-all.sh >> /var/log/rinana-backup.log 2>&1
```

Keep at least 7 daily backups and at least 4 weekly backups. Periodically copy
the backup directory off the VPS.

## Restore

Restore PostgreSQL:

```bash
cd /opt/rinana
bash deploy/scripts/restore-postgres.sh /mnt/backups/rinana/postgres/rinana-postgres-20260621T030000Z.dump
```

Restore MinIO:

```bash
cd /opt/rinana
bash deploy/scripts/restore-minio.sh /mnt/backups/rinana/minio/rinana-minio-20260621T030000Z
```

Restore into a staging server first when possible. PostgreSQL restore uses
`--clean --if-exists`, so it can replace existing tables in the target database.

## Docker logs

`deploy/docker-compose.yml` caps JSON logs for every service:

- `max-size=10m`
- `max-file=5`

This prevents Docker logs from filling the disk during normal operation. Use
external log shipping later if you need longer retention.

## Health check

Run on the server:

```bash
cd /opt/rinana
bash deploy/scripts/health-check.sh
```

Useful overrides:

```bash
SITE_URL=https://lingnaive520.uk/zh \
API_URL=https://lingnaive520.uk/api/auth/me \
MEDIA_PATH="https://lingnaive520.uk/rinana-media/<signed-object-url>" \
bash deploy/scripts/health-check.sh
```

The API check treats `401` and `403` as healthy because `/api/auth/me` is
allowed to require a login. A non-empty `MEDIA_PATH` performs a byte-range HEAD
request for MP4 playback diagnostics.

## Cloudflare cache rules

Use conservative rules first:

1. Bypass cache for `http.request.uri.path starts_with "/api/"`.
2. Cache `http.request.uri.path starts_with "/_next/static/"` with a long edge
   TTL. These files are content-hashed and safe to cache.
3. For `http.request.uri.path starts_with "/rinana-media/"`, keep query strings
   in the cache key. Do not use "Ignore Query String" for signed MinIO URLs.
4. If private media caching is not acceptable, bypass cache for
   `/rinana-media/*`. If short edge reuse is acceptable, keep TTL low, for
   example 900 seconds, and test MP4 Range playback.

Cloudflare's default cache level treats different query strings as different
resources. That is the safe behavior for presigned URLs. Cache Rules can bypass
cache for matching requests, and Cache Rules can also ignore query strings, but
that must not be applied to private signed media URLs.

After enabling Cloudflare proxy, verify:

```bash
curl -I https://lingnaive520.uk/_next/static/
curl -I "https://lingnaive520.uk/rinana-media/<signed-object-url>"
curl -H "Range: bytes=0-1023" -I "https://lingnaive520.uk/rinana-media/<signed-object-url>"
```

The media response should preserve byte-range behavior for MP4 seeking.

## Sources

- Cloudflare request body limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare 413 limits: https://developers.cloudflare.com/support/troubleshooting/http-status-codes/4xx-client-error/error-413/
- Cloudflare cache levels and query strings: https://developers.cloudflare.com/cache/how-to/set-caching-levels/
- Cloudflare Cache Rules settings: https://developers.cloudflare.com/cache/how-to/cache-rules/settings/
