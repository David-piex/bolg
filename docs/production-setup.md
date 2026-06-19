# 绫奈第一版上线方案

## 结论

第一版可以先用免费额度跑起来，但账号必须由你自己注册和持有。我不能替你注册账号、收验证码、绑定付款方式，或者给你创建一个由我掌控后再交付的用户名密码。

我可以负责这些部分：

- 改代码，让项目接 Supabase、Cloudinary、Vercel 或 Netlify。
- 写 Supabase SQL 迁移、RLS 权限、图片 bucket 策略。
- 写 Cloudinary 视频上传签名接口和回写播放地址的代码。
- 配好 Vercel/Netlify 环境变量清单。
- 在你登录 CLI 或提供项目 token 后，帮你执行部署。

你必须自己完成这些部分：

- 注册并登录 Vercel 或 Netlify。
- 注册并登录 Supabase。
- 注册并登录 Cloudinary。
- 完成邮箱/手机验证、账单确认、服务条款确认。
- 保管账号密码和 2FA。后面用户名、邮箱、密码通常都能在各平台账号设置里改。

## 推荐选择

推荐用 Vercel + Supabase + Cloudinary。

Vercel 比 Netlify 更适合这个 Next.js App Router 项目。Supabase 负责登录、数据库、邀请码、用户等级、图片存储。Cloudinary 负责视频上传、转码、缩略图和播放地址。

Netlify 也能部署，但后续 Next.js 动态接口、服务端函数和环境变量管理，Vercel 更顺。

## 费用判断

当前目标不做支付、不做评论点赞、不做用户投稿、不做自动到期，所以第一版成本可以压到免费额度内。

可能需要付费的情况：

- 访问量、图片、数据库、视频流量超过免费额度。
- Cloudinary 视频较多或视频文件较大，转码和带宽会更快触顶。
- 你要绑定自定义域名、团队协作、高级日志、更多构建分钟或更高带宽。
- Supabase 项目长期不用或资源超过免费限制时，可能需要升级 Pro。

实操建议：先免费启动，等有真实用户和内容量后再看 Supabase/Cloudinary/Vercel 的用量面板。

## 账号创建顺序

1. 创建 Supabase 项目。
   - 记录 Project URL。
   - 记录 anon public key。
   - 记录 service role key，只放服务端环境变量，不能放浏览器。
   - 在 SQL Editor 执行 `supabase/migrations/20260619_initial_media_membership.sql`。

2. 创建 Cloudinary 项目。
   - 记录 cloud name。
   - 记录 API key。
   - 记录 API secret，只放服务端环境变量。
   - 可选：创建 unsigned/signed upload preset。第一版建议用服务端签名上传。

3. 创建 Vercel 项目。
   - Framework 选择 Next.js。
   - Build command: `npm run build` 或按 Vercel 自动识别。
   - Output 不需要手动填。
   - 添加下面环境变量。

## 环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_UPLOAD_FOLDER=rinana/videos

NEXT_PUBLIC_SITE_URL=
ADMIN_EMAIL=
```

说明：

- `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 可以暴露给浏览器。
- `SUPABASE_SERVICE_ROLE_KEY` 只能在服务端使用，不能传给前端。
- `CLOUDINARY_API_SECRET` 只能在服务端使用。
- `ADMIN_EMAIL` 是你第一个管理员账号邮箱。初始化后可以在 Supabase `profiles` 表里改管理员。

## 服务端接口

项目已经准备好这些服务端接口，密钥只在服务端读取，不会暴露给浏览器：

```text
POST /api/auth/register
POST /api/auth/login
GET /api/content
POST /api/content
POST /api/supabase/image-upload
POST /api/cloudinary/video-signature
POST /api/cloudinary/video-metadata
```

用途：

- `/api/auth/register`: 用邀请码创建 Supabase Auth 用户，并通过 RPC 原子消费邀请码、创建 `profiles`。
- `/api/auth/login`: 用 Supabase 密码登录并返回用户资料和 session token。
- `/api/content`: 读取 `posts/albums/photos/video_collections/videos`。访客用 Supabase anon key 读取公开内容；登录用户转发自己的 `accessToken`，由 Supabase RLS 决定可见等级。
- `POST /api/content`: 管理员发布内容。动态写 `posts`；相册写 `albums` 和首张 `photos`；视频合集写 `video_collections` 和首条 `videos`。
- `/api/supabase/image-upload`: 生成 Supabase Storage 图片签名上传 URL。
- `/api/cloudinary/video-signature`: 生成 Cloudinary 视频上传签名、public id、upload URL。
- `/api/cloudinary/video-metadata`: 用 Cloudinary public id 拉取播放地址、缩略图和处理状态。

上传签名和视频元数据接口已经加管理员校验。前端请求这些接口时必须带 Supabase 登录返回的管理员 `accessToken`：

```text
Authorization: Bearer <access_token>
```

普通用户或未登录用户请求会返回 `401`。

前端登录/注册页已经接入 `/api/auth/register` 和 `/api/auth/login`。登录成功后，页面会保存 Supabase `accessToken`，后续管理端上传签名请求使用该 token。

管理员后台现在可以直接选择本地文件上传：图片会先请求 `/api/supabase/image-upload`，再 PUT 到 Supabase Storage 签名 URL；视频会先请求 `/api/cloudinary/video-signature`，再把文件和签名参数发给 Cloudinary。上传成功后，表单会自动回填图片地址或视频播放地址；视频还会保留 Cloudinary `public_id` 和缩略图，发布时一起写入 `videos`。

前端内容列表会在启动后请求 `/api/content`。如果 Supabase 环境变量未配置或接口不可用，页面保留本地演示数据，不会阻断本地预览。生产环境要看到真实内容，必须先执行 SQL 迁移并在内容表中写入记录。

管理员后台发布表单会先更新本地状态以保持响应；如果当前账号有管理员 Supabase `accessToken`，同时会调用 `POST /api/content` 写入 Supabase，并用服务端返回的记录替换本地临时记录。

## 数据库结构

SQL 迁移文件已经准备好：

```text
supabase/migrations/20260619_initial_media_membership.sql
```

它会创建：

- `profiles`: 用户资料、会员等级、禁用状态、管理员标记。
- `invite_codes`: 一次性邀请码，带预设等级。
- `posts`: 动态。
- `albums`: 相册。
- `photos`: 图片。
- `video_collections`: 视频合集。
- `videos`: Cloudinary 视频记录。
- `storage.images`: Supabase 图片 bucket。
- `consume_invite_for_user`: 注册时原子消费邀请码并创建用户资料，避免同一个邀请码被并发重复使用。

RLS 策略：

- 访客只能看公开内容。
- 登录用户按 `normal/gold/diamond` 等级看内容。
- 管理员可管理内容、邀请码、用户等级。
- 图片 bucket 公开读取，写入只允许管理员。

## 管理员初始化

第一版推荐流程：

1. 你先用自己的邮箱注册。
2. 我帮你运行 SQL 把这个邮箱设为管理员。

SQL:

```sql
update public.profiles
set is_admin = true,
    level = 'diamond',
    disabled = false
where email = '你的邮箱';
```

如果要改管理员邮箱，先在 Supabase Auth 里改用户邮箱，或新建用户后执行同样 SQL。

## 部署命令

先在项目根目录生成本机 `.env.local`：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\init-env-local.ps1
```

把 Supabase、Cloudinary、站点地址和管理员邮箱填入 `.env.local` 后，跑预检：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-preflight.ps1 -SkipBuild
```

如果你已经安装并登录 Vercel CLI：

```powershell
npm install -g vercel
vercel login
powershell -ExecutionPolicy Bypass -File .\scripts\vercel-deploy.ps1
```

Vercel 生产部署：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\vercel-deploy.ps1 -Production
```

也可以手动执行：

```powershell
vercel deploy -y
```

生产部署：

```powershell
vercel deploy --prod -y
```

如果你选择 Netlify：

```powershell
npm install -g netlify-cli
netlify login
powershell -ExecutionPolicy Bypass -File .\scripts\netlify-deploy.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\netlify-deploy.ps1 -Production
```

## 我还需要你提供什么

要让我继续把它真正接上线，你需要完成账号登录后给我以下信息或让我使用已登录 CLI：

- Vercel：已登录 CLI，或 Vercel 项目权限。
- Supabase：Project URL、anon key、service role key。
- Cloudinary：cloud name、API key、API secret。
- 你的管理员邮箱。

不要把这些密钥发到公开仓库。只放本机 `.env.local` 或 Vercel/Supabase/Cloudinary 的后台环境变量。
