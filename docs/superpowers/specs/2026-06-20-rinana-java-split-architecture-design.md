# 绫奈站点 Java 前后端分离重构设计

## 1. 背景与目标

当前项目是一个基于 Next.js 的个人媒体会员站，已经具备邀请码注册、会员分级浏览、管理员发布动态/相册/视频的产品方向，但生产方案依赖 Supabase、Cloudflare R2 和 Cloudflare Workers。现阶段目标已经切换为自有服务器部署，并确认采用前后端分离架构：

- 前端继续使用 Next.js。
- 后端改为 Spring Boot。
- 部署方式改为 Docker Compose。
- 基础设施改为 PostgreSQL、Redis、MinIO、Nginx。
- 视频不做转码，只保存原始文件并要求优先使用浏览器可直接播放的 MP4(H.264/AAC)。

本次重构的目标不是保留现有云服务兼容性，而是落地一套能在 `4 核 4G` 单机 Linux 服务器上稳定运行、便于后续扩展的自托管版本。

## 2. 已确认决策

### 2.1 技术选型

- 前端：Next.js
- 后端：Spring Boot
- 数据库：PostgreSQL
- 缓存与令牌存储：Redis
- 对象存储：MinIO
- 反向代理：Nginx
- 编排：Docker Compose

### 2.2 产品规则

- 登录方式：用户名或邮箱 + 密码。
- 注册方式：用户名 + 邮箱 + 密码 + 邀请码。
- 邀请码可预置注册后的会员等级。
- 会员等级：`NORMAL`、`GOLD`、`DIAMOND`。
- 角色等级：`USER`、`ADMIN`、`SUPER_ADMIN`。
- 超级管理员不在公开前端展示，只在登录后的账号能力和管理接口中体现。
- `SUPER_ADMIN` 不能通过前端注册产生，只能通过初始化脚本或环境变量引导创建。
- 图片和视频都存入 MinIO。
- 视频不转码，不做 HLS，不做多码率。

### 2.3 运行边界

- 单机优先，不引入 Kubernetes。
- 不拆分独立媒体服务、搜索服务、消息队列服务。
- 前后端通过同域反向代理通信，不引入额外 API 网关。
- 当前阶段不保留 Supabase/R2 作为双写或回退通道。

## 3. 非目标

以下内容不在本阶段实现范围内：

- 视频转码、截图、封面自动生成、多清晰度播放
- 手机验证码登录
- 第三方 OAuth 登录
- 多机部署与高可用
- 多租户
- 支付接入
- 管理员在前端公开展示

## 4. 总体架构

### 4.1 服务拓扑

对外只暴露 Nginx，一个站点域名同时承载前端页面和后端 API：

- `/` -> Next.js 前端
- `/api/` -> Spring Boot 后端

MinIO 不作为公开主入口，默认使用私有 bucket。媒体访问先经过后端鉴权，再返回短时效预签名地址；这样可以避免由后端长时间代理视频流，减轻 `4 核 4G` 服务器压力。

### 4.2 服务职责

#### 前端（Next.js）

- 用户端页面：首页、动态、相册、视频、登录/注册
- 登录后根据用户角色动态展示管理入口
- 管理后台界面：发布动态、发布相册、发布视频、生成邀请码、管理用户
- 调用后端 REST API
- 不直接持有管理员长期密钥

#### 后端（Spring Boot）

- 认证与授权
- 邀请码注册
- 用户、角色、会员等级、状态管理
- 动态、相册、视频、媒体元数据管理
- 媒体上传、访问鉴权、MinIO 预签名 URL 下发
- 管理员审计日志

#### PostgreSQL

- 保存业务主数据和关系数据

#### Redis

- 保存刷新令牌
- 登录态辅助信息
- 限流、短期缓存、封禁即时失效控制

#### MinIO

- 保存图片和视频原始文件

#### Nginx

- HTTPS 终结
- 前后端反向代理
- 请求体大小限制
- 静态压缩与常规安全头

## 5. 认证与权限模型

### 5.1 角色模型

- `SUPER_ADMIN`：系统最高权限，负责管理员管理、系统级配置、邀请码策略、所有用户和内容的完全管理。
- `ADMIN`：负责发动态、发相册、发视频、管理普通用户、管理邀请码和业务内容。
- `USER`：普通登录用户，只能在自身会员等级范围内浏览内容。

### 5.2 会员模型

- `NORMAL`
- `GOLD`
- `DIAMOND`

角色和会员等级必须分离：

- 角色决定管理能力。
- 会员等级决定内容可见范围。

`SUPER_ADMIN` 和 `ADMIN` 默认具备全部内容访问权限，但这属于后端授权规则，不是通过把管理员会员等级写成特殊值来实现。

### 5.3 用户状态

- `ACTIVE`
- `DISABLED`

被禁用的用户不可继续登录。若用户在封禁前已登录，Redis 中对应刷新令牌必须失效，短期访问令牌到期后无法继续续期。

### 5.4 登录态设计

后端采用 Spring Security。

- 访问令牌：短时效 JWT，建议 `15` 分钟。
- 刷新令牌：随机 opaque token，服务端以哈希形式存入 Redis，建议有效期 `7` 到 `30` 天。
- 访问令牌与刷新令牌都通过 `HttpOnly` Cookie 下发，避免前端本地存储长期令牌。

这样既保留了 JWT 的轻量鉴权优势，也保留了主动登出、封禁失效和单机缓存管理能力。

### 5.5 超级管理员隐藏策略

- 未登录状态下，任何公开页面不出现超级管理员标识。
- 登录成功后，通过 `/api/auth/me` 返回当前用户角色。
- 前端根据角色决定是否展示管理入口。
- 普通用户与普通管理员均不获得超级管理员公开信息列表。
- `ADMIN` 无权提升任何账号为 `SUPER_ADMIN`，也无权修改 `SUPER_ADMIN` 账号。

## 6. 内容与数据模型

### 6.1 users

字段建议：

- `id`
- `username`，唯一
- `email`，唯一
- `password_hash`
- `display_name`
- `role`
- `member_level`
- `status`
- `avatar_url`
- `created_at`
- `updated_at`

### 6.2 invite_codes

字段建议：

- `id`
- `code`，唯一
- `initial_level`
- `max_uses`
- `used_count`
- `expires_at`
- `status`
- `created_by`
- `created_at`

### 6.3 media_assets

统一记录图片和视频元数据：

- `id`
- `media_type`：`IMAGE` / `VIDEO`
- `bucket_name`
- `object_key`
- `original_name`
- `mime_type`
- `size_bytes`
- `width`
- `height`
- `duration_seconds`
- `cover_object_key`
- `uploaded_by`
- `created_at`

MinIO 采用单私有 bucket `rinana-media`，通过对象前缀区分资源：

- `images/...`
- `videos/...`
- `covers/...`

`bucket_name` 字段保留，是为了后续迁移或拆桶时不改表结构。

### 6.4 posts

字段建议：

- `id`
- `title`
- `content`
- `visibility`：`PUBLIC` / `NORMAL` / `GOLD` / `DIAMOND`
- `status`：`DRAFT` / `PUBLISHED`
- `is_pinned`
- `author_id`
- `published_at`
- `created_at`
- `updated_at`

### 6.5 post_media

- `id`
- `post_id`
- `media_asset_id`
- `sort_order`

### 6.6 albums

- `id`
- `title`
- `description`
- `visibility`
- `cover_media_id`
- `status`
- `author_id`
- `published_at`
- `created_at`
- `updated_at`

### 6.7 album_items

- `id`
- `album_id`
- `media_asset_id`
- `sort_order`

### 6.8 videos

- `id`
- `title`
- `description`
- `visibility`
- `media_asset_id`
- `cover_media_id`
- `status`
- `author_id`
- `published_at`
- `created_at`
- `updated_at`

### 6.9 admin_audit_logs

- `id`
- `admin_user_id`
- `action_type`
- `target_type`
- `target_id`
- `detail_json`
- `created_at`

### 6.10 索引建议

至少包括以下索引：

- `users(username)` 唯一索引
- `users(email)` 唯一索引
- `invite_codes(code)` 唯一索引
- `posts(status, visibility, published_at desc)`
- `albums(status, visibility, published_at desc)`
- `videos(status, visibility, published_at desc)`
- `media_assets(uploaded_by, created_at desc)`
- `admin_audit_logs(admin_user_id, created_at desc)`

## 7. 媒体上传与访问链路

### 7.1 上传规则

- 只有 `ADMIN` 和 `SUPER_ADMIN` 可以上传媒体。
- 图片和视频都通过后端 API 进入 MinIO。
- 视频只接受浏览器直接支持的格式，第一优先是 `mp4` + `H.264/AAC`。
- 上传完成后，由后端写入 `media_assets`，再由内容实体与媒体资产建立关联。

### 7.2 图片链路

1. 管理后台选择图片并提交。
2. 前端请求后端上传接口。
3. 后端校验角色、文件类型、大小限制。
4. 后端写入 MinIO `images/...`。
5. 后端落库 `media_assets`。
6. 内容发布时，通过关联表把图片挂到动态或相册上。

### 7.3 视频链路

1. 管理后台选择视频并提交。
2. 前端请求后端上传接口。
3. 后端校验角色、文件类型、大小限制。
4. 后端写入 MinIO `videos/...`。
5. 后端落库 `media_assets`。
6. 发布视频内容时，写入 `videos` 表并关联 `media_asset_id`。

### 7.4 访问链路

1. 前端请求某个受权限保护的图片或视频资源。
2. 后端根据当前登录用户角色、会员等级、内容可见范围进行鉴权。
3. 鉴权通过后，后端返回一个短时效 MinIO 预签名 GET URL。
4. 前端使用该 URL 加载图片或播放视频。

预签名 URL 有效期建议控制在 `1` 到 `5` 分钟，避免直接暴露长期可复用地址。

### 7.5 大文件与限制

为避免打爆单机资源，第一版先加以下限制：

- 图片单文件大小限制
- 视频单文件大小限制
- 后台上传并发限制
- Nginx `client_max_body_size`

具体阈值在实现阶段根据目标视频尺寸再定，但设计上必须保留这套限制。

## 8. API 设计原则

后端采用 REST API，统一挂在 `/api` 下。

核心接口分组：

- `/api/auth/*`
- `/api/users/*`
- `/api/invites/*`
- `/api/posts/*`
- `/api/albums/*`
- `/api/videos/*`
- `/api/media/*`
- `/api/admin/*`

返回格式遵循以下原则：

- 成功：返回明确的 JSON 对象或分页结构
- 失败：使用 Spring Boot Problem Details 风格，至少包含 `status`、`title`、`detail`，并补充稳定的业务 `errorCode`

这样前端可以统一处理登录失败、邀请码无效、权限不足、媒体上传失败等错误。

## 9. 部署设计

### 9.1 Docker Compose 容器

生产 Compose 保留以下容器：

- `nginx`
- `frontend`
- `backend`
- `postgres`
- `redis`
- `minio`

不引入额外网关、任务调度器、消息队列。

### 9.2 Nginx 路由

- `/` -> `frontend`
- `/api/` -> `backend`

MinIO Console 只开放给管理用途，可使用独立端口或独立子域名，但不走站点主入口。

### 9.3 资源预算

基于 `4 核 4G` 服务器，建议预算：

- `nginx`：`64MB` 到 `128MB`
- `frontend`：`256MB` 到 `384MB`
- `backend`：`512MB` 到 `768MB`
- `postgres`：`384MB` 到 `512MB`
- `redis`：`64MB` 到 `128MB`
- `minio`：`256MB` 到 `512MB`

JVM 参数建议：

- `-Xms256m`
- `-Xmx768m`

### 9.4 持久化卷

至少保留以下数据卷：

- PostgreSQL 数据卷
- MinIO 数据卷

Redis 默认可作为缓存层使用，但若需要刷新令牌跨容器重启保留，则也应开启持久化。

## 10. 初始化与运维要求

### 10.1 超级管理员初始化

首次启动时，后端读取环境变量中的超级管理员初始化信息：

- `SUPER_ADMIN_USERNAME`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`
- `SUPER_ADMIN_DISPLAY_NAME`

初始化逻辑要求：

- 若数据库中不存在 `SUPER_ADMIN`，则创建首个超级管理员。
- 若已存在，则不重复创建。
- 不允许通过公开注册接口创建 `SUPER_ADMIN`。

### 10.2 日志与审计

- 应用日志按容器标准输出
- 管理员关键操作进入 `admin_audit_logs`
- 登录失败、封禁、权限拒绝、邀请码耗尽等关键行为保留结构化日志

### 10.3 备份

最少需要：

- PostgreSQL 定期备份
- MinIO 媒体文件备份

Redis 不是主数据来源，不能替代数据库和对象存储备份。

## 11. 前端改造范围

前端保留现有 Next.js 页面层，但要从“自带后端 + Supabase/R2 直连”切换为“只消费 Spring Boot API”：

- 删除 Supabase 登录、内容读取、媒体上传运行时依赖
- 删除 Cloudflare Workers/R2 运行时依赖
- 把前端数据获取统一收敛到后端 REST API 客户端
- 根据 `/api/auth/me` 的角色信息控制管理入口显示

前端在这次重构中不承担真正的权限控制职责，所有关键权限必须以后端为准。

## 12. 实施阶段建议

建议按以下顺序实施：

1. 建立 `backend/` Spring Boot 工程骨架
2. 落用户、邀请码、角色、会员等级、内容、媒体表结构
3. 接入 PostgreSQL、Redis、MinIO
4. 完成认证、刷新令牌、超级管理员初始化
5. 完成动态、相册、视频、媒体上传接口
6. 改造 Next.js 前端 API 客户端
7. 建立 Docker Compose 与 Nginx 配置
8. 联调并完成服务器部署

## 13. 测试策略

### 13.1 后端

- 单元测试：权限判断、邀请码校验、会员可见范围判断、上传规则校验
- 集成测试：使用 Testcontainers 验证 PostgreSQL、Redis、MinIO 交互
- 接口测试：登录、注册、权限拒绝、内容发布、媒体上传与访问

### 13.2 前端

- 组件测试：登录页、内容列表、管理入口显示
- API 客户端测试：认证、错误处理、上传流程

### 13.3 部署验证

至少覆盖：

- Docker Compose 启动成功
- Nginx 代理正确
- 注册、登录、退出、刷新令牌可用
- 邀请码限制生效
- 超级管理员初始化成功
- 管理员可发动态、图片、视频
- 不同会员等级内容可见范围正确

## 14. 风险与对应策略

### 14.1 风险：视频文件过大导致单机压力高

策略：限制视频大小、限制并发、只支持直接播放格式、不做转码。

### 14.2 风险：前后端重构期间接口替换跨度大

策略：先稳定后端契约，再逐页替换前端数据来源，不保留长期双栈。

### 14.3 风险：管理员权限边界被前端误实现

策略：所有写操作与敏感读操作以后端鉴权为准，前端只做入口控制和状态展示。

## 15. 最终结论

本项目的落地方案确定为：

- 保留 Next.js 前端
- 新建 Spring Boot 后端
- 使用 PostgreSQL、Redis、MinIO、Nginx、Docker Compose
- 单机部署到 `4 核 4G` Linux 服务器
- 登录方式为用户名或邮箱 + 密码
- 注册必须使用邀请码
- 角色采用 `USER`、`ADMIN`、`SUPER_ADMIN`
- 会员等级采用 `NORMAL`、`GOLD`、`DIAMOND`
- 图片与视频统一进入 MinIO
- 视频不转码，只做原文件私有存储和鉴权访问

后续实现与部署应以本设计为准，不再继续围绕 Supabase、Cloudflare R2、Cloudflare Workers 做生产方案扩展。
