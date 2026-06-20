# 生产环境配置

生产环境目标是一台 Linux 服务器，通过 Docker Compose 运行完整服务。

## 服务

- `nginx`：公网入口，监听 `80` 和 `443`
- `frontend`：Next.js 前端，容器网络内监听 `3000`
- `backend`：Spring Boot API，容器网络内监听 `8080`
- `postgres`：PostgreSQL 16，使用持久化卷
- `redis`：Redis 7，使用持久化卷
- `minio`：MinIO 对象存储，使用持久化卷

## 必要文件

部署前需要复制并编辑环境变量模板。保留 `*.example` 作为模板，真实生产值写入 `*.env` 文件：

- `deploy/env/backend.env`
- `deploy/env/frontend.env`
- `deploy/env/postgres.env`
- `deploy/env/minio.env`

至少要修改这些默认密码和密钥：

- `DATABASE_PASSWORD`
- `MINIO_SECRET_KEY`
- `MINIO_PUBLIC_ENDPOINT`
- `JWT_SECRET`
- `SUPER_ADMIN_PASSWORD`
- `POSTGRES_PASSWORD`
- `MINIO_ROOT_PASSWORD`

## 部署

全新服务器部署：

```bash
cd /opt/rinana
bash deploy/server-deploy.sh
```

手动部署：

```bash
cd deploy
docker compose up -d --build
docker compose ps
```

查看日志：

```bash
docker compose logs -f backend
docker compose logs -f nginx
```

当前线上入口：

- 主站：`https://lingnaive520.uk/zh`
- 管理员登录：`https://lingnaive520.uk/zh/login`
- MinIO 控制台：`http://SERVER_IP:9001`

`MINIO_PUBLIC_ENDPOINT` 必须设置为用户浏览器能访问的地址。当前 Cloudflare 域名部署使用：

```env
MINIO_PUBLIC_ENDPOINT=https://lingnaive520.uk
```

后端容器内部仍然使用：

```env
MINIO_ENDPOINT=http://minio:9000
```

后端会在第一次上传时创建 `MINIO_BUCKET` 指定的 bucket。默认 bucket 是 `rinana-media`。

## 首次登录

使用 `deploy/env/backend.env` 里的 `SUPER_ADMIN_*` 配置登录。后端只会在数据库中不存在 `SUPER_ADMIN` 时创建第一个超级管理员。

## 验证

部署完成后检查：

- `/zh` 可以打开。
- `/api/auth/login` 可以通过 Nginx 访问。
- 邀请码注册可用。
- 管理员可以创建邀请码。
- 管理员可以上传图片和视频。
- 管理员可以发布动态、相册和视频。
- NORMAL、GOLD、DIAMOND 账号只能看到自己等级允许的内容。
- 媒体访问必须先通过后端授权，再返回短时有效的 MinIO 预签名地址。
- 页面内图片和视频通过 `/api/media/{id}/view` 加载，并同样经过权限判断。

## 备份

至少备份：

- PostgreSQL 数据卷 `postgres-data`
- MinIO 数据卷 `minio-data`

Redis 用于刷新令牌和短期状态。如果需要在重启后保留登录会话，再考虑持久化或备份 Redis。
