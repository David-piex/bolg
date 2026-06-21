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
- Run manifest: `deploy/backups/manifests/rinana-backup-<timestamp>.txt`

Use a different destination for mounted backup storage:

```bash
BACKUP_ROOT=/mnt/backups/rinana bash deploy/scripts/backup-all.sh
```

Operational knobs:

- `BACKUP_RETENTION_DAYS=14`: prune older PostgreSQL dumps, MinIO mirrors,
  and run manifests after this many days.
- `BACKUP_PRUNE=0`: disable automatic pruning for a one-off run.
- `BACKUP_STAMP=YYYYMMDDTHHMMSSZ`: force a timestamp when testing.

`backup-all.sh` uses `flock` when available so cron does not run overlapping
backups. PostgreSQL dumps include a `.sha256` sidecar when checksum tools are
available. MinIO backups include `summary.txt` and `manifest.txt`.

Suggested cron:

```cron
15 3 * * * cd /opt/rinana && BACKUP_ROOT=/mnt/backups/rinana BACKUP_RETENTION_DAYS=14 bash deploy/scripts/backup-all.sh >> /var/log/rinana-backup.log 2>&1
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
If a PostgreSQL `.sha256` sidecar exists, the restore script verifies it before
running `pg_restore`.

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

Use the concrete rule set in [Cloudflare Cache Rules](cloudflare-cache-rules.md).
The short version is:

1. Bypass cache for `/api/*`.
2. Cache `/_next/static/*` aggressively.
3. Treat `/rinana-media/*` as signed private media unless you have explicitly
   proven a public cache policy is safe. Do not ignore query strings for signed
   MinIO URLs.

After enabling Cloudflare proxy, verify:

```bash
curl -I https://lingnaive520.uk/_next/static/
curl -I "https://lingnaive520.uk/rinana-media/<signed-object-url>"
curl -H "Range: bytes=0-1023" -I "https://lingnaive520.uk/rinana-media/<signed-object-url>"
```

The media response should preserve byte-range behavior for MP4 seeking.

## Sources

- Cloudflare request body limits: https://developers.cloudflare.com/support/troubleshooting/http-status-codes/4xx-client-error/error-413/
- Cloudflare 413 limits: https://developers.cloudflare.com/support/troubleshooting/http-status-codes/4xx-client-error/error-413/
- Cloudflare cache keys and query strings: https://developers.cloudflare.com/cache/how-to/cache-keys/
- Cloudflare Cache Rules settings: https://developers.cloudflare.com/cache/how-to/cache-rules/settings/
