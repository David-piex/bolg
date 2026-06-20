# Deployment Checklist

## Server

- Docker is installed.
- Docker Compose plugin is installed.
- Ports `80`, `9000`, and `9001` are available or intentionally firewalled.
- Server has enough disk space for PostgreSQL and MinIO media.

## Configuration

- Copy `deploy/env/*.example` to matching `deploy/env/*.env` files if the `.env` files do not already exist.
- Edit `deploy/env/postgres.env`.
- Edit `deploy/env/minio.env`.
- Edit `deploy/env/backend.env`.
- Change every default password and secret.
- Confirm `MINIO_BUCKET=rinana-media` or update all related values consistently.
- Set `MINIO_PUBLIC_ENDPOINT` to a browser-reachable address, for example `http://SERVER_IP:9000`.

## Build And Start

```bash
cd deploy
docker compose up -d --build
docker compose ps
```

For a fresh Ubuntu server, this can be automated from the project root:

```bash
bash deploy/server-deploy.sh
```

## MinIO

- Open `http://SERVER_IP:9001`.
- Login with `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD`.
- The backend can create bucket `rinana-media` on first upload if it does not exist.
- Keep the bucket private.

## Smoke Test

- Open `/zh`.
- Login with the super admin.
- Create an invite code.
- Register a normal user with that invite code.
- Upload one image.
- Upload one browser-playable MP4 video.
- Publish one public post.
- Publish one GOLD or DIAMOND video.
- Confirm lower-level users cannot access restricted content.
- Confirm authorized users can open media through `/api/media/{id}/access`.
- Confirm cards and video embeds load through `/api/media/{id}/view`.

## Maintenance

- Back up PostgreSQL regularly.
- Back up MinIO regularly.
- Rotate `JWT_SECRET` only with a planned logout window.
