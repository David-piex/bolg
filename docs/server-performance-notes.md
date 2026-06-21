# 4C4G Server Performance Notes

This project can run on a 4-core / 4 GB VPS, but it needs conservative
runtime limits. The main bottlenecks are usually memory pressure, disk I/O,
and SSR/API latency, not raw CPU.

## Recommended priorities

1. Keep the origin stack small: Nginx + Next + Spring + PostgreSQL + Redis + MinIO.
2. Avoid building Docker images on the VPS if possible.
3. Keep uploads direct and buffering off for upload paths.
4. Put hard memory caps on Java, Node, Redis, and PostgreSQL.
5. Cache static frontend assets and stable media responses.

## Suggested runtime budgets

- Next.js: `NODE_OPTIONS=--max-old-space-size=512`
- Spring Boot: `-Xmx640m` to `-Xmx768m` depending on live memory use
- Redis: `256mb` max memory
- PostgreSQL: `shared_buffers=256MB`, `max_connections=50`
- Nginx: gzip on, upstream keepalive enabled

## What to check when it feels slow

Run these on the server:

```bash
cd /opt/rinana
docker stats --no-stream
docker compose ps
free -h
df -h
```

Look for:

- Memory under 500 MB free after warmup.
- Swap activity.
- Backend or database containers using sustained CPU.
- Disk nearly full or high I/O wait.

## Upload path

Keep these aligned:

- Application file limit: `95MB`
- Spring request limit: `100MB`
- Nginx `client_max_body_size`: `100m`
- Cloudflare proxied upload limit: `100MB` on Free and Pro

For larger videos, use an unproxied upload hostname or chunked/direct upload.

## Notes

If the VPS is still slow after these caps, the next likely improvement is
moving PostgreSQL or MinIO off the app box.
