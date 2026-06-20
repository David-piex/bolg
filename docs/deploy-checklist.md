# 部署检查清单

## 服务器

- 已安装 Docker。
- 已安装 Docker Compose 插件。
- `80` 和 `443` 端口可用。
- `9000` 和 `9001` 不应直接公网开放；MinIO 只通过 Docker 内网和 Nginx 签名媒体路径访问。
- 服务器磁盘空间足够存放 PostgreSQL 数据和 MinIO 媒体文件。

## 配置

- 如果 `deploy/env/*.env` 文件不存在，先从对应的 `deploy/env/*.example` 复制。
- 编辑 `deploy/env/postgres.env`。
- 编辑 `deploy/env/minio.env`。
- 编辑 `deploy/env/backend.env`。
- 修改所有默认密码和密钥。
- 确认 `MAX_UPLOAD_FILE_SIZE=95MB`、`MAX_UPLOAD_REQUEST_SIZE=100MB`，并与 Nginx `client_max_body_size 100m` 保持一致。
- 确认 `MINIO_BUCKET=rinana-media`，或者同步修改所有相关配置。
- 设置 `MINIO_PUBLIC_ENDPOINT` 为浏览器能访问的地址。当前域名部署使用 `https://lingnaive520.uk`。

## 构建和启动

```bash
cd deploy
docker compose up -d --build
docker compose ps
```

全新 Ubuntu 服务器可以从项目根目录自动执行：

```bash
bash deploy/server-deploy.sh
```

## MinIO

- 管理控制台默认不公网暴露；需要维护时通过 SSH 隧道或临时管理员专用 Compose override 访问。
- 使用 `MINIO_ROOT_USER` 和 `MINIO_ROOT_PASSWORD` 登录。
- 后端第一次上传时可以自动创建 `rinana-media` bucket。
- bucket 必须保持私有，不要改成公开读。

## 冒烟测试

- 打开 `/zh`。
- 使用超级管理员登录。
- 创建一个邀请码。
- 使用邀请码注册一个普通用户。
- 上传一张图片。
- 上传一个不超过 `95MB`、浏览器可播放的 MP4 视频。
- 发布一条公开动态。
- 发布一个 GOLD 或 DIAMOND 可见的视频。
- 确认低等级用户不能访问高等级内容。
- 确认授权用户可以通过 `/api/media/{id}/access` 打开媒体。
- 确认卡片图片和视频嵌入通过 `/api/media/{id}/view` 正常加载。
- 用 `curl -I` 或浏览器开发者工具确认 `/rinana-media/` 响应包含 `Accept-Ranges: bytes`。
- Cloudflare 开启代理后，再测试一次接近 `95MB` 的视频上传，确认不会出现 `413`。

## 维护

- 定期备份 PostgreSQL。
- 定期备份 MinIO。
- 只有在计划让所有用户重新登录时，才轮换 `JWT_SECRET`。
- 确认 `MINIO_PUBLIC_ENDPOINT` 指向浏览器可访问的同源地址，例如 `https://lingnaive520.uk`，让直传 URL 落到 `/rinana-media/...`。
- 确认 `/rinana-media/` 支持预签 `PUT` 上传，并保留 `Range` / `If-Range` 播放请求。
- 验证管理员上传视频时同时上传独立封面图，发布后视频卡片显示封面而不是默认图。
- Cloudflare 开启代理后，不缓存 `/api/media/direct-uploads*`；如缓存 `/rinana-media/*`，不要忽略预签 URL 的 query string。
