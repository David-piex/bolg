# 绫奈账号和密钥工作表

最后更新：2026-06-19

这个文件只记录“去哪里拿值”和“填到哪里”。不要把真实密钥写进这个文件。真实值只填到本机 `.env.local`，或者填到 Vercel/Netlify 后台环境变量。

## 费用判断

第一版可以先用免费档启动，但不等于永远免费：

- Vercel Hobby 是免费档，适合个人项目和小规模应用；超过免费额度后通常会等额度周期恢复或升级。
- Netlify Free 有固定免费额度，超出后站点可能暂停到下个周期，不会自动产生意外费用。
- Supabase Free 有免费数据库、认证和存储额度；数据、活跃用户、带宽或文件存储超过后需要升级。
- Cloudinary 有免费计划，支持图片和视频；这个项目最容易先触顶的是视频存储、转码和播放流量。

建议先不开自动扣费、不开自动充值，等真实用户和内容量起来后再看各平台 Usage 面板。

## 我不能代办的部分

这些必须由你本人完成并持有账号：

- 注册 Vercel 或 Netlify。
- 注册 Supabase。
- 注册 Cloudinary。
- 接收邮箱或手机验证码。
- 同意服务条款、完成账号安全设置、绑定或确认付款方式。
- 保管用户名、密码、2FA 和恢复码。

这些账号后面通常都能在各平台 Account Settings 里改邮箱、用户名、密码和 2FA。项目内管理员不是平台账号，它通过 Supabase `profiles.is_admin` 控制，后面也能改。

## 推荐选择

优先用 Vercel + Supabase + Cloudinary。

Vercel 对 Next.js App Router 支持更顺，部署脚本也已经准备好。Netlify 是备选。

## 需要你填进 `.env.local` 的值

文件位置：

```text
D:\Code\思考\personal-media-site\.env.local
```

### Supabase

创建 Supabase project 后，在 Project Settings 里复制：

| `.env.local` 名称 | 从哪里拿 | 用途 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | 前端和服务端连接项目 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key | 访客和登录用户按 RLS 读取内容 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | 服务端注册、发邀请码、管理员写入 |

注意：`SUPABASE_SERVICE_ROLE_KEY` 不能发到前端，不能发到公开仓库。

然后在 Supabase SQL Editor 执行：

```text
D:\Code\思考\personal-media-site\supabase\migrations\20260619_initial_media_membership.sql
```

### Cloudinary

在 Cloudinary Dashboard / API Keys 里复制：

| `.env.local` 名称 | 从哪里拿 | 用途 |
| --- | --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Cloud name | 拼接上传和播放资源地址 |
| `CLOUDINARY_API_KEY` | API key | 服务端生成视频上传签名 |
| `CLOUDINARY_API_SECRET` | API secret | 服务端生成视频上传签名 |
| `CLOUDINARY_UPLOAD_FOLDER` | 可保留默认 `rinana/videos` | 视频上传目录 |

注意：`CLOUDINARY_API_SECRET` 不能发到前端，不能发到公开仓库。

### 站点和管理员

| `.env.local` 名称 | 填什么 |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 本地先保留 `http://localhost:3007`；部署后改成真实 Vercel/Netlify 地址 |
| `ADMIN_EMAIL` | 你准备用作站长的邮箱 |

你注册站内账号后，把这个邮箱提成管理员：

```sql
update public.profiles
set is_admin = true,
    level = 'diamond',
    disabled = false
where email = '你的邮箱';
```

### Vercel 或 Netlify

二选一即可。

| `.env.local` 名称 | 从哪里拿 | 用途 |
| --- | --- | --- |
| `VERCEL_TOKEN` | Vercel Account Settings / Tokens | 让我非交互部署到 Vercel |
| `NETLIFY_AUTH_TOKEN` | Netlify User Settings / Applications / Personal access tokens | 让我非交互部署到 Netlify |

如果你不想填 token，也可以自己在本机命令行跑 `vercel login` 或 `netlify login`，登录成功后我继续执行部署脚本。

## 填完后让我跑的命令

Vercel 推荐流程：

```powershell
cd D:\Code\思考\personal-media-site
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-preflight.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\vercel-deploy.ps1
```

Netlify 备选流程：

```powershell
cd D:\Code\思考\personal-media-site
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-preflight.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\netlify-deploy.ps1
```

## 部署后检查

上线后需要确认：

- `/zh` 能打开。
- `/zh/login` 能用邀请码注册。
- 注册后的账号能登录。
- 普通、黄金、钻石账号看到的内容范围不同。
- 管理员能进入 `/zh/admin`。
- 管理员能上传图片，Supabase Storage 出现对象。
- 管理员能上传视频，Cloudinary 出现资源。
- 管理员发布的动态、相册、视频能写入 Supabase 并在前台显示。

