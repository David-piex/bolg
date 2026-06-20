# 绫奈 Java 前后端分离实施记录

本文档记录绫奈站点从前端单体/云服务方案迁移到自托管 Java 前后端分离方案的实施结果。当前仓库已经完成该迁移，本文不再作为逐步编码计划使用。

## 1. 实施目标

将站点改造成可在单台 Linux VPS 上部署的自托管系统：

- Next.js 前端
- Spring Boot 后端
- PostgreSQL 数据库
- Redis 刷新令牌和短期状态
- MinIO 媒体对象存储
- Nginx 公网入口
- Docker Compose 部署

生产运行时不再依赖 Supabase、Cloudflare R2、Cloudflare Workers、Vercel 或 Netlify。

## 2. 当前目录结构

```text
bolg/
  backend/
    pom.xml
    src/main/java/com/rinana/media/
    src/main/resources/
    src/test/java/com/rinana/media/
  deploy/
    docker-compose.yml
    nginx/site.conf
    env/
    server-deploy.sh
  docs/
  src/
    app/
    components/
    services/
    state/
  Dockerfile.frontend
  package.json
  README.md
```

## 3. 已完成模块

### 后端

- Spring Boot 项目骨架。
- Flyway 初始数据库结构。
- 用户、角色、会员等级、账号状态模型。
- 超级管理员初始化。
- 邀请码注册。
- 登录、刷新令牌、退出登录、当前用户接口。
- 内容接口：动态、相册、视频。
- 会员等级可见性过滤。
- 管理员接口：用户管理、邀请码管理。
- MinIO 图片和视频上传。
- 媒体访问鉴权和短时预签名 URL。
- 账号资料、头像、邮箱、密码修改。

### 前端

- 接入 Java 后端 API。
- 保留中文页面 `/zh`。
- 登录、注册、账号页。
- 动态、相册、视频浏览。
- 管理员后台入口和管理功能。
- 图片/视频上传和发布流程。
- 中文文案和基础视觉优化。

### 部署

- Docker Compose 服务：`nginx`、`frontend`、`backend`、`postgres`、`redis`、`minio`。
- Nginx 代理前端、后端和媒体访问路径。
- 部署脚本 `deploy/server-deploy.sh`。
- Cloudflare 域名接入。
- 源站 443 已开放，当前可使用 Cloudflare SSL/TLS `Full` 模式。

## 4. 核心运行方式

本地开发目录：

```powershell
cd D:\Code\bolg
```

前端验证：

```powershell
pnpm install
pnpm test
pnpm build
```

后端验证：

```powershell
cd D:\Code\bolg\backend
mvn test
```

提交代码：

```powershell
cd D:\Code\bolg
git status
git add .
git commit -m "说明这次改了什么"
git push origin main
```

服务器更新：

```bash
ssh root@66.154.102.131
cd /opt/rinana
git pull --ff-only origin main
docker compose -f deploy/docker-compose.yml up -d --build
docker compose -f deploy/docker-compose.yml ps
```

服务器验证：

```bash
curl -k https://127.0.0.1/zh
curl http://127.0.0.1/api/content
```

## 5. 线上状态

当前线上主地址：

- `https://lingnaive520.uk/zh`

管理员登录：

- `https://lingnaive520.uk/zh/login`

超级管理员账号由服务器环境变量控制：

- `SUPER_ADMIN_USERNAME`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`
- `SUPER_ADMIN_DISPLAY_NAME`

不要把真实密码写入文档或提交到 Git。

## 6. 重要配置

后端环境变量文件：

```text
/opt/rinana/deploy/env/backend.env
```

关键项：

- `DATABASE_URL`
- `DATABASE_USERNAME`
- `DATABASE_PASSWORD`
- `SPRING_DATA_REDIS_HOST`
- `MINIO_ENDPOINT`
- `MINIO_PUBLIC_ENDPOINT`
- `MAX_UPLOAD_FILE_SIZE`
- `MAX_UPLOAD_REQUEST_SIZE`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `JWT_SECRET`
- `SUPER_ADMIN_*`

当前域名部署下：

```env
MINIO_ENDPOINT=http://minio:9000
MINIO_PUBLIC_ENDPOINT=https://lingnaive520.uk
MAX_UPLOAD_FILE_SIZE=95MB
MAX_UPLOAD_REQUEST_SIZE=100MB
```

## 7. 已验证内容

已完成过的验证包括：

- 前端测试通过。
- 后端 Maven 测试通过。
- Next.js 生产构建通过。
- Docker Compose 服务启动。
- Nginx 80/443 可访问。
- `/zh` 页面可访问。
- `/api/content` 返回 200。
- 管理员登录可用。
- 邀请码注册可用。
- GOLD/DIAMOND 可见性规则可用。
- 图片上传可用。
- 视频上传可用，默认单个视频不超过 `95MB`。
- 头像上传小于 10MB 的限制可用。
- 邮箱和密码修改可用。

## 8. 后续建议

- 给 PostgreSQL 和 MinIO 增加定时备份。
- 保持 MinIO `9000/9001` 不直接公网暴露，维护时通过 SSH 隧道或临时管理员专用 Compose override 访问。
- 生成正确的 Cloudflare Origin Server Certificate 后，将 SSL/TLS 从 `Full` 切换为 `Full (strict)`。
- 增加上传前视频格式提示和上传进度显示。
- 增加服务器磁盘占用监控。
- 增加管理员审计日志查看页面。
