# 绫奈

这是一个私人的媒体会员站，采用 Next.js 前端和 Spring Boot 后端，支持邀请码注册、会员分级浏览、管理员发布图文/相册/视频，以及 Docker 单机部署。

## 技术栈

- 前端：Next.js App Router
- 后端：Spring Boot REST API，统一挂在 `/api`
- 数据库：PostgreSQL
- 会话支持：Redis 刷新令牌
- 媒体存储：MinIO 私有 bucket
- 反向代理：Nginx
- 部署方式：Docker Compose

生产环境已经不再依赖 Supabase、Cloudflare R2、Cloudflare Workers、Vercel 或 Netlify。Cloudflare 只用于域名 DNS 和 HTTPS 代理。

## 本地验证

前端：

```powershell
$env:Path='C:\Users\Yao\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
.\node_modules\.bin\vitest.CMD run
.\node_modules\.bin\next.CMD build
```

后端：

```powershell
cd backend
mvn test
```

Docker 部署需要在已经安装 Docker 的机器上验证：

```bash
cd deploy
cp env/postgres.example env/postgres.env
cp env/minio.example env/minio.env
cp env/backend.example env/backend.env
cp env/frontend.example env/frontend.env
docker compose up -d --build
docker compose ps
```

全新 Ubuntu 服务器可以在项目根目录运行部署脚本。脚本会创建缺失的环境变量文件、安装 Docker、构建并启动整套服务：

```bash
cd /opt/rinana
bash deploy/server-deploy.sh
```

## 生产结构

公网只暴露 Nginx：

- `/` -> 前端容器
- `/api/` -> 后端容器
- `/rinana-media/` -> MinIO 私有对象的短时签名访问入口

媒体文件通过后端上传，存入 MinIO。用户访问媒体时，后端先做权限判断，再返回短时有效的 MinIO 预签名地址。

## 核心接口

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

## 超级管理员

当数据库中还没有 `SUPER_ADMIN` 时，后端会根据环境变量创建第一个超级管理员：

- `SUPER_ADMIN_USERNAME`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`
- `SUPER_ADMIN_DISPLAY_NAME`

超级管理员账号不要公开展示。前端只会在登录后根据角色显示管理入口，后端也会做权限校验。

## 页面

- `/zh`
- `/zh/posts`
- `/zh/albums`
- `/zh/videos`
- `/zh/login`
- `/zh/admin`

英文页面使用 `/en` 前缀。
