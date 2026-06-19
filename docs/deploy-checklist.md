# 部署检查清单

## 费用和账号边界

第一版可以从免费档开始，但不等于永久免费。Vercel 或 Netlify、Supabase、Cloudinary 都有免费额度；用户量、构建次数、数据库、图片、视频处理和带宽超过额度后可能收费。这个项目里最容易先触顶的是 Cloudinary 视频：视频文件大、转码和播放流量都比图片更快消耗额度。

账号必须由你本人注册并持有。我不能替你接收邮箱/手机验证码、完成服务条款确认、绑定付款方式，或创建一个由我掌控的账号再把用户名密码交给你。你后面通常可以在各平台账号设置里改用户名、邮箱、密码和 2FA；项目内管理员也可以通过 Supabase `profiles` 表调整。

## 当前可交付物

源码包可用于部署。每次改完代码后需要重新生成，避免上传旧版本：

```text
artifacts/rinana-vercel-source.tgz
```

重新生成命令：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\package-source.ps1
```

这个脚本会排除 `.env.local`、`node_modules`、`.next` 和本地日志，避免把密钥或构建缓存打进部署包。

项目根目录也可以直接导入 Vercel 或 Netlify：

```text
D:\Code\思考\personal-media-site
```

## 本地预检

先检查本机部署工具：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-tools-doctor.ps1 -WithInstallHints
```

如果 `npm` 缺失，先安装或修复 Node.js：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-deploy-tools.ps1
```

如果安装器提示打开新的 PowerShell，重新打开后再跑：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-deploy-tools.ps1 -CheckOnly
```

先生成本机 `.env.local` 模板。这个文件只放在你电脑上，不要提交到公开仓库：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\init-env-local.ps1
```

然后把 Supabase、Cloudinary、站点地址和管理员邮箱填进去。

部署前可以先跑预检脚本。默认会跑测试、类型检查和构建；如果只想看账号工具和环境变量缺口，加 `-SkipBuild`：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-preflight.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-preflight.ps1 -SkipBuild
```

当前机器如果显示 `vercel_cli/netlify_cli/npm/pnpm` 为 `missing`，说明还不能从命令行直接部署。环境变量显示 `missing` 时，说明 Supabase、Cloudinary 或管理员邮箱还没配置。

## Vercel 推荐流程

1. 登录 Vercel。
2. 新建项目，导入这个项目目录或上传源码包。
3. Framework preset 选择 `Next.js`。
4. Build command 使用默认值或 `npm run build`。
5. 添加环境变量：

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

6. 部署 Preview。
7. 确认 Preview 没问题后再点 Promote to Production。

如果你在本机完成 Vercel CLI 登录，我可以继续执行：

```powershell
npm install -g vercel
vercel login
powershell -ExecutionPolicy Bypass -File .\scripts\vercel-deploy.ps1
```

如果你不想走浏览器登录，也可以在 `.env.local` 里填 `VERCEL_TOKEN`，脚本会自动使用 token。

生产部署：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\vercel-deploy.ps1 -Production
```

脚本会读取 `.env.local`，把环境变量推到 Vercel，然后部署。也可以手动执行：

```powershell
vercel deploy -y
vercel deploy --prod -y
```

## Netlify 备选流程

1. 登录 Netlify。
2. 新建站点，导入项目。
3. Build command:

```text
npm run build
```

4. Publish directory 通常由 Netlify Next.js 插件处理，不要手动填静态目录。
5. 添加同样的环境变量。

如果你在本机完成 Netlify CLI 登录，我可以继续执行：

```powershell
npm install -g netlify-cli
netlify login
powershell -ExecutionPolicy Bypass -File .\scripts\netlify-deploy.ps1
```

如果你不想走浏览器登录，也可以在 `.env.local` 里填 `NETLIFY_AUTH_TOKEN`，脚本会自动使用 token。

生产部署：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\netlify-deploy.ps1 -Production
```

## Supabase 必做

在 Supabase SQL Editor 执行：

```text
supabase/migrations/20260619_initial_media_membership.sql
```

然后确认：

- `profiles` 表存在。
- `invite_codes` 表存在。
- `consume_invite_for_user` 函数存在。
- `posts/albums/photos/video_collections/videos` 表存在。
- `GET /api/content` 能读取公开内容；登录后带 `Authorization: Bearer <access_token>` 能按会员等级读取更多内容。
- Storage 里有 `images` bucket。
- 管理员后台上传图片后，Supabase Storage 里能看到对象，并且表单会回填公开图片地址。
- RLS 已启用。

## Cloudinary 必做

确认 Cloudinary 后台能看到：

- Cloud name。
- API key。
- API secret。

第一版建议只走服务端签名上传，不把 secret 放到浏览器。

管理员后台上传视频后，Cloudinary 媒体库里应出现对应资源；表单会回填播放地址，发布后 `videos.cloudinary_public_id` 和 `thumbnail_url` 应有值。

## 管理员账号

你注册后，把管理员邮箱设置到 `ADMIN_EMAIL`。初始化管理员 SQL：

```sql
update public.profiles
set is_admin = true,
    level = 'diamond',
    disabled = false
where email = '你的邮箱';
```

后续换管理员时，改 `profiles.is_admin` 即可。
