# 部署检查清单

## 服务器

- 已安装 Docker。
- 已安装 Docker Compose 插件。
- `80` 和 `443` 端口可用。
- `9000` 和 `9001` 端口如果继续暴露，需要确认是有意开放；生产环境建议后续收紧。
- 服务器磁盘空间足够存放 PostgreSQL 数据和 MinIO 媒体文件。

## 配置

- 如果 `deploy/env/*.env` 文件不存在，先从对应的 `deploy/env/*.example` 复制。
- 编辑 `deploy/env/postgres.env`。
- 编辑 `deploy/env/minio.env`。
- 编辑 `deploy/env/backend.env`。
- 修改所有默认密码和密钥。
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

- 管理控制台默认是 `http://SERVER_IP:9001`。
- 使用 `MINIO_ROOT_USER` 和 `MINIO_ROOT_PASSWORD` 登录。
- 后端第一次上传时可以自动创建 `rinana-media` bucket。
- bucket 必须保持私有，不要改成公开读。

## 冒烟测试

- 打开 `/zh`。
- 使用超级管理员登录。
- 创建一个邀请码。
- 使用邀请码注册一个普通用户。
- 上传一张图片。
- 上传一个浏览器可播放的 MP4 视频。
- 发布一条公开动态。
- 发布一个 GOLD 或 DIAMOND 可见的视频。
- 确认低等级用户不能访问高等级内容。
- 确认授权用户可以通过 `/api/media/{id}/access` 打开媒体。
- 确认卡片图片和视频嵌入通过 `/api/media/{id}/view` 正常加载。

## 维护

- 定期备份 PostgreSQL。
- 定期备份 MinIO。
- 只有在计划让所有用户重新登录时，才轮换 `JWT_SECRET`。
