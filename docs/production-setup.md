# Production Setup

The production target is a single Linux server running Docker Compose.

## Services

- `nginx`: public entrypoint on port 80
- `frontend`: Next.js app on port 3000 inside the Docker network
- `backend`: Spring Boot API on port 8080 inside the Docker network
- `postgres`: PostgreSQL 16 with a persistent volume
- `redis`: Redis 7 with a persistent volume
- `minio`: MinIO object storage with a persistent volume

## Required Files

Copy and edit the env templates before deployment. Keep the `*.example` files as templates and put real production values in `*.env` files:

- `deploy/env/backend.env`
- `deploy/env/frontend.env`
- `deploy/env/postgres.env`
- `deploy/env/minio.env`

At minimum, change all default passwords and secrets:

- `DATABASE_PASSWORD`
- `MINIO_SECRET_KEY`
- `MINIO_PUBLIC_ENDPOINT`
- `JWT_SECRET`
- `SUPER_ADMIN_PASSWORD`
- `POSTGRES_PASSWORD`
- `MINIO_ROOT_PASSWORD`

## Deploy

Fresh server helper:

```bash
cd /opt/rinana
bash deploy/server-deploy.sh
```

Manual deployment:

```bash
cd deploy
docker compose up -d --build
docker compose ps
```

Check logs:

```bash
docker compose logs -f backend
docker compose logs -f nginx
```

Open:

- Site: `http://SERVER_IP/zh`
- Admin login: `http://SERVER_IP/zh/login`
- MinIO console: `http://SERVER_IP:9001`

Set `MINIO_PUBLIC_ENDPOINT` to an address the user's browser can reach. With the default compose ports this is usually `http://SERVER_IP:9000`. The backend still uses `MINIO_ENDPOINT=http://minio:9000` inside Docker.

The backend creates the MinIO bucket named by `MINIO_BUCKET` on first upload if it does not exist. The default bucket is `rinana-media`.

## First Login

Use the `SUPER_ADMIN_*` values from `deploy/env/backend.env` after editing them. The backend creates the first super admin only when the database has no existing `SUPER_ADMIN`.

## Verification

After deployment, verify:

- `/zh` loads.
- `/api/auth/login` works through Nginx.
- Invite-only registration works.
- Admin can create invite codes.
- Admin can upload image and video media.
- Admin can publish posts, albums, and videos.
- NORMAL, GOLD, and DIAMOND accounts see only allowed content.
- Media access returns a short-lived presigned MinIO URL only after authorization.
- Images and videos embedded in pages use `/api/media/{id}/view`, which performs the same authorization and redirects to a short-lived MinIO URL.

## Backups

Back up at least:

- PostgreSQL volume `postgres-data`
- MinIO volume `minio-data`

Redis is used for refresh tokens and short-lived state; persist or back it up only if preserving sessions across restarts matters.
