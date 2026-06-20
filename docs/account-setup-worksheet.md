# 服务器配置记录表

不要把真实密码或密钥提交到 Git。

## 域名和服务器

| 项目 | 值 |
| --- | --- |
| 服务器 IP | |
| 域名 | |
| SSH 用户 | |
| 部署路径 | |

## 后端密钥

| 变量 | 值 |
| --- | --- |
| `DATABASE_PASSWORD` | |
| `JWT_SECRET` | |
| `SUPER_ADMIN_USERNAME` | |
| `SUPER_ADMIN_EMAIL` | |
| `SUPER_ADMIN_PASSWORD` | |
| `SUPER_ADMIN_DISPLAY_NAME` | |

## MinIO

| 变量 | 值 |
| --- | --- |
| `MINIO_ROOT_USER` | |
| `MINIO_ROOT_PASSWORD` | |
| `MINIO_ACCESS_KEY` | |
| `MINIO_SECRET_KEY` | |
| `MINIO_BUCKET` | `rinana-media` |

## 常用命令

```bash
cd deploy
docker compose up -d --build
docker compose logs -f backend
```
