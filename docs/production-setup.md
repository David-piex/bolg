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
- MinIO 控制台：默认不公网暴露；如需维护，请通过 SSH 隧道或临时的管理员专用 Compose override 访问。

`MINIO_PUBLIC_ENDPOINT` 必须设置为用户浏览器能访问的地址。当前 Cloudflare 域名部署使用：

```env
MINIO_PUBLIC_ENDPOINT=https://lingnaive520.uk
```

后端容器内部仍然使用：

```env
MINIO_ENDPOINT=http://minio:9000
```

后端会在第一次上传时创建 `MINIO_BUCKET` 指定的 bucket。默认 bucket 是 `rinana-media`。

## 上传和媒体访问

生产默认限制：

- `MAX_UPLOAD_FILE_SIZE=95MB`
- `MAX_UPLOAD_REQUEST_SIZE=100MB`
- Nginx `client_max_body_size 100m`

这个配置是为了适配 Cloudflare Free/Pro 代理请求体 `100MB` 上限。Cloudflare 当前按套餐限制上传请求体：Free/Pro `100MB`、Business `200MB`、Enterprise 默认 `500MB+`。视频文件限制为 `95MB`，给 multipart 表单边界和请求头留余量，避免线上上传接近 100MB 时被 Cloudflare 或 Nginx 返回 `413`。

`deploy/nginx/site.conf` 中 `/api/media/` 对上传关闭请求缓冲和临时文件落盘，减少大文件上传时 Nginx 中间层占用；普通 `/api/` 接口保持默认代理行为。`/rinana-media/` 保留 `Range` / `If-Range` 转发，并返回 `Accept-Ranges: bytes`，保证视频拖动、续播和 Safari/iOS 基础播放能力。

当前没有视频转码流水线。上线内容建议使用：

- 容器：`.mp4`
- 视频编码：H.264
- 音频编码：AAC
- 体积：不超过 `95MB`

如果以后需要上传更大的视频，有四个方向：

- 上传专用域名关闭 Cloudflare 代理，只让主站和播放域名走 CDN。
- 做分片上传，让每个分片低于 Cloudflare 请求体限制。
- 接 Cloudflare Stream/R2 或 S3 直传，应用只负责签名和写业务记录。
- 升级 Cloudflare 套餐后再同步调大 Spring、Nginx 和前端校验。

直接把 Nginx 和 Spring 改到 `512MB` 不能绕过 Cloudflare 代理层限制。

## Cloudflare CDN 注意事项

媒体访问 URL 是短时 MinIO 预签名 URL，签名参数会进入 query string。Cloudflare 默认会把不同 query string 当成不同缓存键，所以缓存命中率不会天然很高。不要全站开启“忽略 query string”；这可能破坏签名 URL 的权限语义。若要缓存媒体，应只对明确安全的媒体路径单独建 Cache Rules，并先确认私有内容不会被越权缓存。

MP4 经 Cloudflare 代理时，先保证 Range 请求能透传并确认浏览器可拖动播放。如果 Safari/iOS 出现黑屏或无法拖动，再按 Cloudflare 当前 MP4/Safari 排障文档处理：优先确认源站支持 `Range`，避免错误的缓存规则影响 `206 Partial Content`，必要时对 MP4 路径单独绕过缓存或调整强 ETag。先保证播放稳定，再考虑缓存收益。

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
## 2026-06-20 上传与 CDN 说明

当前生产上传链路使用两步直传：

1. 管理员前端调用 `POST /api/media/direct-uploads`，后端校验管理员权限、MIME 类型和大小限制，并签发短时 MinIO `PUT` URL。
2. 浏览器把文件直接 `PUT` 到 `/rinana-media/...` 对应的 MinIO 对象路径，不再让 Spring Boot 转发整段视频文件。
3. 上传成功后前端调用 `POST /api/media/direct-uploads/complete`，后端校验对象存在且大小一致，再写入 `media_assets`。
4. 旧的 `/api/media/images` 和 `/api/media/videos` multipart 上传仍保留，当前前端会在直传不可用时回退。

大小限制保持：

- 图片：`10MB`
- 视频：`95MB`
- Spring：`MAX_UPLOAD_FILE_SIZE=95MB`、`MAX_UPLOAD_REQUEST_SIZE=100MB`
- Nginx：`client_max_body_size 100m`

如果走 Cloudflare Free/Pro 代理，不要把视频限制直接调到 `100MB` 以上；接近 100MB 时还要给请求头和边界留余量，所以应用层使用 `95MB`。后续如果需要更大视频，优先做分片上传、关闭上传域名的 Cloudflare 代理、或接 Cloudflare Stream/R2，不要只改 Nginx/Spring。

`MINIO_PUBLIC_ENDPOINT` 当前推荐继续设为主站同源，例如：

```env
MINIO_PUBLIC_ENDPOINT=https://lingnaive520.uk
```

这样预签 URL 会落到 `https://lingnaive520.uk/rinana-media/...`，浏览器直传不需要额外 CORS。如果未来切到 `https://media.lingnaive520.uk`，需要同步配置 MinIO/Nginx CORS，允许主站域名发起 `PUT`、`GET`、`HEAD`。

Cloudflare CDN 注意点：

- `/api/media/direct-uploads*` 和 `/api/media/*/access|view` 不要缓存。
- `/rinana-media/*` 必须保留 `Range` / `If-Range`，否则 MP4 拖动、续播和 Safari/iOS 播放容易异常。
- 预签 URL 带 query string，不要全站启用“忽略 query string”缓存规则；如要缓存媒体，只对确认安全的公开媒体路径单独建 Cache Rules。
- 视频封面现在作为独立图片资产上传，发布视频时会把封面 `mediaAssetId` 写入 `coverMediaId`。
