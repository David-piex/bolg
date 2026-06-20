# Rinana

Next.js frontend plus Spring Boot backend for a private personal media membership site.

## Stack

- Frontend: Next.js App Router
- Backend: Spring Boot REST API under `/api`
- Database: PostgreSQL
- Session support: Redis refresh tokens
- Media storage: MinIO private bucket
- Reverse proxy: Nginx
- Deployment: Docker Compose

Supabase, Cloudflare R2, Cloudflare Workers, Vercel, and Netlify are no longer part of the production runtime.

## Local Verification

Frontend:

```powershell
$env:Path='C:\Users\Yao\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
.\node_modules\.bin\vitest.CMD run
.\node_modules\.bin\next.CMD build
```

Backend:

```powershell
cd backend
mvn test
```

Docker deployment must be verified on a machine with Docker installed:

```bash
cd deploy
cp env/postgres.example env/postgres.env
cp env/minio.example env/minio.env
cp env/backend.example env/backend.env
cp env/frontend.example env/frontend.env
docker compose up -d --build
docker compose ps
```

On a fresh Ubuntu server, the deploy helper can create missing env files, install Docker, build, and start the stack:

```bash
cd /opt/rinana
bash deploy/server-deploy.sh
```

## Production Shape

Only Nginx is exposed publicly:

- `/` -> frontend container
- `/api/` -> backend container

Media is uploaded through the backend, stored in MinIO, and accessed through short-lived MinIO presigned URLs after backend authorization.

## Core API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/content`
- `POST /api/content/posts`
- `POST /api/content/albums`
- `POST /api/content/videos`
- `PATCH /api/content/posts/{id}`
- `PATCH /api/content/albums/{id}`
- `PATCH /api/content/videos/{id}`
- `DELETE /api/content/posts/{id}`
- `DELETE /api/content/albums/{id}`
- `DELETE /api/content/videos/{id}`
- `POST /api/media/images`
- `POST /api/media/videos`
- `GET /api/media/{id}/access`
- `GET /api/media/{id}/view`
- `GET /api/admin/users`
- `PATCH /api/admin/users/{id}`
- `POST /api/admin/invites`
- `GET /api/admin/invites`
- `DELETE /api/admin/invites/{id}`

## Admin Bootstrap

The first `SUPER_ADMIN` is created from backend environment variables when no super admin exists:

- `SUPER_ADMIN_USERNAME`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`
- `SUPER_ADMIN_DISPLAY_NAME`

Do not expose the super admin account publicly. It only appears after login through role-aware UI and backend authorization.

## Pages

- `/zh`
- `/zh/posts`
- `/zh/albums`
- `/zh/videos`
- `/zh/login`
- `/zh/admin`

English pages use `/en` instead of `/zh`.
