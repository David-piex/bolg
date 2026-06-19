# 绫奈

一个双语个人媒体会员站原型。默认中文，可切换英文。第一版目标是邀请码注册、会员等级浏览、管理员发布动态/相册/视频。

## 本地运行

```powershell
$node = "C:\Users\Yao\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
& $node ".\node_modules\vitest\vitest.mjs" run
& $node ".\node_modules\next\dist\bin\next" dev -p 3007
```

访问：

```text
http://localhost:3007/zh
```

## 当前实现

- Next.js App Router。
- `/zh` 为中文体验，`/en` 为英文体验。
- 访客、普通、黄金、钻石、管理员权限逻辑已有测试。
- 一次性邀请码和预设等级逻辑已有测试。
- 相册/视频合集默认权限与单条内容覆盖逻辑已有测试。
- 登录/注册页面已接入本项目的 `/api/auth/register` 和 `/api/auth/login`。
- 内容读取已接入 `/api/content`，由服务端转发 Supabase anon key 或用户 `accessToken`，让 Supabase RLS 控制公开/普通/黄金/钻石可见范围。
- 未配置 Supabase 时，前端会保留 `src/data/mock-data.ts` 和浏览器 `localStorage` 作为本地演示兜底。
- 管理员发布内容时，如果当前管理员有 Supabase `accessToken`，前端会调用 `POST /api/content` 写入 Supabase；未配置环境或写入失败时保留本地演示记录。
- 管理员后台支持选择本地图片和视频文件。图片通过 Supabase Storage 签名 URL 上传，视频通过 Cloudinary 签名参数上传，上传完成后自动回填发布表单。

## 生产接入计划

第一版生产环境使用：

- Vercel：部署 Next.js。
- Supabase：登录、数据库、邀请码、用户等级、图片存储。
- Cloudinary：视频上传、视频处理、缩略图和播放地址。

生产说明在这里：

```text
docs/production-setup.md
```

账号、费用和密钥填写工作表在这里：

```text
docs/account-setup-worksheet.md
```

Supabase 初始 SQL 在这里：

```text
supabase/migrations/20260619_initial_media_membership.sql
```

环境变量模板：

```text
.env.example
```

生成本机 `.env.local`：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\init-env-local.ps1
```

已准备的服务端接口：

- `POST /api/supabase/image-upload`
- `POST /api/cloudinary/video-signature`
- `POST /api/cloudinary/video-metadata`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/content`
- `POST /api/content`

上传签名和视频元数据接口需要管理员 Supabase session 的 `Authorization: Bearer <access_token>`。前端登录成功后会把 session 保存在本地状态，管理端上传工具会用这个 token 请求签名。

管理端图片文件会上传到 Supabase `images` bucket，并把公开对象 URL 用于动态封面或相册首图。视频文件会上传到 Cloudinary，并把播放地址、缩略图和 `public_id` 用于视频合集记录。

内容读取接口会接受可选的 `Authorization: Bearer <access_token>`。访客不带 token 时只能读取公开内容；登录用户带 token 时按 Supabase RLS 读取对应会员等级内容。

内容发布接口需要管理员 `Authorization: Bearer <access_token>`。动态写入 `posts`；相册写入 `albums` 和首张 `photos`；视频合集写入 `video_collections` 和首条 `videos`。

## 页面

- `/zh` 首页。
- `/zh/posts` 动态。
- `/zh/albums` 相册。
- `/zh/videos` 视频。
- `/zh/login` 邀请码登录/注册。
- `/zh/admin` 管理员后台。

英文对应路径把 `/zh` 改成 `/en`。
