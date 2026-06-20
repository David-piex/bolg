# Server Setup Worksheet

Do not commit real passwords or secrets.

## Domain And Server

| Item | Value |
| --- | --- |
| Server IP | |
| Domain | |
| SSH user | |
| Deploy path | |

## Backend Secrets

| Variable | Value |
| --- | --- |
| `DATABASE_PASSWORD` | |
| `JWT_SECRET` | |
| `SUPER_ADMIN_USERNAME` | |
| `SUPER_ADMIN_EMAIL` | |
| `SUPER_ADMIN_PASSWORD` | |
| `SUPER_ADMIN_DISPLAY_NAME` | |

## MinIO

| Variable | Value |
| --- | --- |
| `MINIO_ROOT_USER` | |
| `MINIO_ROOT_PASSWORD` | |
| `MINIO_ACCESS_KEY` | |
| `MINIO_SECRET_KEY` | |
| `MINIO_BUCKET` | `rinana-media` |

## Commands

```bash
cd deploy
docker compose up -d --build
docker compose logs -f backend
```
