# 绫奈站点 Java 前后端分离架构设计

## 1. 背景和目标

绫奈是一个私人媒体会员站，核心能力包括邀请码注册、会员分级浏览、管理员发布动态/相册/视频，以及超级管理员管理用户和邀请码。

项目已经从 Supabase、Cloudflare R2、Cloudflare Workers、Vercel、Netlify 方案迁移到自有服务器部署。当前生产目标是单台 Linux VPS，通过 Docker Compose 运行完整服务。

目标：

- 前端继续使用 Next.js。
- 后端使用 Spring Boot。
- 数据库使用 PostgreSQL。
- 刷新令牌和短期状态使用 Redis。
- 图片和视频存入 MinIO。
- 公网入口由 Nginx 承担。
- 通过 Docker Compose 部署到 `4 核 4G` 左右的单机服务器。
- 视频不转码、不做 HLS、不做多码率，要求优先上传浏览器可直接播放的 MP4。

## 2. 技术选型

- 前端：Next.js App Router
- 后端：Spring Boot REST API
- 数据库：PostgreSQL
- 缓存和刷新令牌：Redis
- 对象存储：MinIO
- 反向代理：Nginx
- 编排：Docker Compose
- 域名和 HTTPS：Cloudflare DNS/代理 + 服务器源站 HTTPS

## 3. 产品规则

- 登录方式：用户名或邮箱 + 密码。
- 注册方式：用户名 + 邮箱 + 密码 + 邀请码。
- 邀请码可预设注册后的会员等级。
- 会员等级：`NORMAL`、`GOLD`、`DIAMOND`。
- 角色：`USER`、`ADMIN`、`SUPER_ADMIN`。
- 超级管理员不在公开前端展示，只在登录后通过角色能力体现。
- `SUPER_ADMIN` 不能通过前端注册产生，只能通过初始化环境变量或服务器侧维护产生。
- 图片、头像和视频统一存入 MinIO。
- 管理员可以发布动态、相册和视频。
- 普通用户只能浏览自己等级允许的内容。

## 4. 非目标

当前阶段不做：

- 视频转码、截图、封面自动生成、多清晰度播放。
- 手机验证码登录。
- 第三方 OAuth 登录。
- 多机高可用。
- 多租户。
- 支付系统。
- 公开展示管理员身份。
- Kubernetes 部署。

## 5. 总体架构

公网只暴露 Nginx：

- `/` -> Next.js 前端容器
- `/api/` -> Spring Boot 后端容器
- `/rinana-media/` -> MinIO 对象访问入口，仅用于后端生成的短时签名 URL

MinIO bucket 保持私有。用户访问媒体时，先访问后端接口，后端完成权限判断后再返回短时有效的预签名地址。

## 6. 服务职责

### 前端

- 展示首页、动态、相册、视频、登录、注册、账号页。
- 登录后根据角色显示管理入口。
- 提供管理员后台界面：发布动态、发布相册、发布视频、生成邀请码、管理用户。
- 只调用后端 REST API。
- 不保存管理员长期密钥。

### 后端

- 登录、注册、刷新令牌、退出登录。
- 邀请码校验和消费。
- 用户、角色、会员等级、账号状态管理。
- 动态、相册、视频、媒体元数据管理。
- 媒体上传到 MinIO。
- 媒体访问鉴权和预签名 URL 下发。
- 管理操作审计。

### PostgreSQL

保存业务主数据，包括用户、邀请码、内容、媒体元数据和审计日志。

### Redis

保存刷新令牌和短期状态。后续也可用于限流、封禁即时失效和短期缓存。

### MinIO

保存图片、头像和视频原始文件。

### Nginx

- 终止源站 HTTPS。
- 反向代理前端和后端。
- 转发媒体签名 URL 到 MinIO。
- 设置上传大小、超时和静态资源缓存策略。

## 7. 权限模型

### 角色

- `SUPER_ADMIN`：最高权限，可管理用户、邀请码、内容和系统级配置。
- `ADMIN`：可发布内容、上传媒体、管理普通用户和邀请码。
- `USER`：普通登录用户，只能浏览自己会员等级允许的内容。

### 会员等级

- `NORMAL`
- `GOLD`
- `DIAMOND`

访问规则：

- `PUBLIC` 内容：未登录也可看。
- `NORMAL` 内容：登录用户可看。
- `GOLD` 内容：`GOLD` 和 `DIAMOND` 可看。
- `DIAMOND` 内容：仅 `DIAMOND` 可看。
- `ADMIN` 和 `SUPER_ADMIN` 默认具备全部内容访问权限。

### 账号状态

- `ACTIVE`：正常。
- `DISABLED`：禁用，不能继续登录；已登录用户的刷新令牌应失效。

## 8. 数据模型

核心表：

- `users`
- `invite_codes`
- `media_assets`
- `posts`
- `post_media`
- `albums`
- `album_items`
- `videos`
- `admin_audit_logs`
- `refresh_tokens`

核心索引：

- `users(username)` 唯一索引
- `users(email)` 唯一索引
- `invite_codes(code)` 唯一索引
- `posts(status, visibility, published_at desc)`
- `albums(status, visibility, published_at desc)`
- `videos(status, visibility, published_at desc)`
- `media_assets(uploaded_by, created_at desc)`
- `admin_audit_logs(admin_user_id, created_at desc)`

## 9. 媒体设计

MinIO 使用私有 bucket：`rinana-media`。

对象前缀：

- `images/...`
- `videos/...`
- `avatars/...`
- `covers/...`

上传流程：

1. 管理员或超级管理员通过前端选择文件。
2. 前端调用后端上传接口。
3. 后端校验登录状态、角色、文件类型和大小。
4. 后端写入 MinIO。
5. 后端写入 `media_assets`。
6. 发布内容时将内容实体和媒体资产关联。

访问流程：

1. 前端请求 `/api/media/{id}/view` 或 `/api/media/{id}/access`。
2. 后端根据内容可见性和用户身份做权限判断。
3. 鉴权通过后返回或重定向到短时有效的 MinIO 预签名 URL。
4. 浏览器使用该 URL 获取图片或视频。

## 10. 部署设计

生产容器：

- `nginx`
- `frontend`
- `backend`
- `postgres`
- `redis`
- `minio`

公网入口：

- `80`
- `443`

当前域名：

- 主站：`https://lingnaive520.uk/zh`
- 管理员登录：`https://lingnaive520.uk/zh/login`

Cloudflare 当前建议：

- DNS：主域名和 `www` 指向服务器 IP，并开启代理。
- SSL/TLS 模式：当前源站自签证书下使用 `Full`。
- 如果以后换成 Cloudflare Origin Server Certificate，再切换为 `Full (strict)`。

## 11. 资源规划

在 `4 核 4G` 单机上，建议内存控制：

- `nginx`：`64MB` 到 `128MB`
- `frontend`：`256MB` 到 `384MB`
- `backend`：`512MB` 到 `768MB`
- `postgres`：`384MB` 到 `512MB`
- `redis`：`64MB` 到 `128MB`
- `minio`：`256MB` 到 `512MB`

视频不转码可以显著降低 CPU 压力，但会要求上传的视频格式本身适合浏览器播放。

## 12. 备份

必须定期备份：

- PostgreSQL 数据卷
- MinIO 数据卷

Redis 不是主数据来源，不能替代数据库和对象存储备份。

## 13. 后续方向

- 收紧 MinIO `9000/9001` 端口的公网暴露。
- 换成 Cloudflare Origin Server Certificate，并切换到 `Full (strict)`。
- 增加自动备份脚本。
- 增加管理员审计列表。
- 增加视频格式提示和上传前校验。
