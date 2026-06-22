# 项目问题分析与修复报告

生成时间: 2026-06-22

## ✅ 已修复的问题

### 🔴 高危问题

#### 1. JSON注入漏洞 (已修复)
**位置**: `AdminAuditService.java`, `AdminController.java`, `SiteSettingsController.java`

**问题**: 使用字符串拼接构建JSON,未对特殊字符转义
```java
// 修复前 - 危险!
"{\"code\":\"" + saved.getCode() + "\"}"  // 如果code包含引号会破坏JSON

// 修复后 - 安全
adminAuditService.record(admin, "CREATE_INVITE", "INVITE_CODE", saved.getId(),
  Map.of("code", saved.getCode())
);
```

**修复内容**:
- 在`AdminAuditService`中添加`ObjectMapper`依赖注入
- 新增接受`Map<String, Object>`的重载方法,自动序列化为JSON
- 更新所有调用点使用Map而非字符串拼接

---

#### 2. 媒体文件删除问题 (已修复)
**问题**: 删除内容时,关联的媒体文件没有从MinIO删除,导致存储泄漏

**修复内容**:
- 在`MediaStorageService`接口添加`deleteObject`方法
- 在`MinioMediaStorageService`实现MinIO对象删除
- 更新`ContentController`的删除方法,同步删除媒体文件
- 添加智能检测,避免删除被其他内容引用的媒体
- 在各Repository添加查询方法检查媒体使用情况

---

#### 3. Logo自定义功能 (已完成)
**新功能**: 站点左上角支持上传自定义Logo图片

**实现内容**:
- 扩展`SiteSettingsEntity`,添加`logo_image_id`外键
- 数据库迁移: `V5__add_logo_image_to_site_settings.sql`
- 更新相关DTO和Controller

---

### 🎨 UI优化 (已完成)

**配色方案**: 恢复并优化粉色主题,适合女性用户的私密网站
- 主色: `#e94b8f` (柔美粉色)
- 背景: 渐变粉色背景 `#fff0f6` → `#ffe4f0`
- 强调色: `#d68bb5`, `#9b6fb8`

**组件优化**:
- 导航栏: 圆角24px,磨砂玻璃效果,粉色渐变阴影
- 按钮: 渐变背景,圆角20px,悬停动画
- 输入框: 圆角12px,柔和边框,焦点高亮
- 卡片: 柔和阴影,悬停上浮效果

---

## 🟠 待修复的中高危问题

### 后端问题

#### 1. 竞态条件 - AuthService.java (中危)
**位置**: 行34-62

**问题**: 注册时检查用户名/邮箱存在性和插入操作之间有时间窗口
```java
if (userRepository.existsByUsername(request.username())) {
  throw new ApiException(...);
}
// 在这里另一个线程可能插入相同用户名
UserEntity user = new UserEntity();
```

**影响**: 虽然数据库有唯一约束,但用户会收到不友好的数据库异常

**修复建议**:
```java
try {
  UserEntity user = new UserEntity();
  // ... 设置属性
  return userRepository.save(user);
} catch (DataIntegrityViolationException e) {
  if (e.getMessage().contains("username")) {
    throw new ApiException(HttpStatus.CONFLICT, "USERNAME_EXISTS", "用户名已存在");
  }
  if (e.getMessage().contains("email")) {
    throw new ApiException(HttpStatus.CONFLICT, "EMAIL_EXISTS", "邮箱已被使用");
  }
  throw e;
}
```

---

#### 2. N+1查询问题 - ContentController.java (中危)
**位置**: 删除Post时遍历mediaItems (行372-383)

**问题**: 每次删除检查会触发多次数据库查询
```java
for (PostMediaEntity mediaItem : post.getMediaItems()) {
  MediaAssetEntity asset = mediaItem.getMediaAsset(); // 延迟加载
  if (!isMediaUsedElsewhere(asset.getId(), ...)) {  // 4次查询
    // 删除
  }
}
```

**影响**: 删除包含10张图片的Post可能执行40+次查询

**修复建议**:
```java
// 在PostRepository添加
@EntityGraph(attributePaths = {"mediaItems", "mediaItems.mediaAsset"})
Optional<PostEntity> findByIdWithMedia(UUID id);

// 批量检查媒体使用情况
Set<UUID> mediaIds = post.getMediaItems().stream()
  .map(item -> item.getMediaAsset().getId())
  .collect(Collectors.toSet());

// 一次查询获取所有使用情况
Map<UUID, Long> usageCounts = mediaAssetRepository.countUsagesByIds(mediaIds);
```

---

#### 3. 缓存一致性问题 - ContentFeedCache.java (中危)
**位置**: 行77-89

**问题**: Redis连接失败时只记录日志,不抛异常,导致缓存变脏

**修复建议**:
```java
// 方案1: 添加缓存版本号
private final AtomicLong cacheVersion = new AtomicLong(0);

public void evictAll() {
  cacheVersion.incrementAndGet();
  redisTemplate.delete(ALL_USER_TYPES); // 即使失败也有版本号保护
}

// 方案2: Redis失败时降级
public Optional<ContentFeedResponse> get(String key) {
  try {
    return Optional.ofNullable(redisTemplate.opsForValue().get(key));
  } catch (RedisConnectionException e) {
    log.warn("Redis unavailable, cache disabled");
    return Optional.empty(); // 降级为不使用缓存
  }
}
```

---

#### 4. 资源泄漏风险 - RefreshTokenService.java (低危)
**位置**: 行27

**问题**: `fallbackTokens` Map无限增长,过期token不清理

**修复建议**:
```java
// 使用Caffeine缓存替代ConcurrentHashMap
private final LoadingCache<String, StoredRefreshToken> fallbackTokens =
  Caffeine.newBuilder()
    .expireAfterWrite(7, TimeUnit.DAYS)
    .maximumSize(10_000)
    .build(key -> null);
```

---

### 前端问题

#### 1. localStorage存储Token (高危)
**位置**: `AppStateProvider.tsx` 行614

**问题**: Token存储在localStorage,容易被XSS攻击窃取

**修复建议**:
- 使用httpOnly cookie存储accessToken
- refreshToken存httpOnly cookie
- localStorage只存非敏感的UI状态

---

#### 2. 表单验证缺失 (中危)
**位置**: `LoginView.tsx`, `AccountSettingsView.tsx`

**问题**:
- 邮箱格式未验证
- 密码长度未强制
- 提交按钮无disabled状态
- 无重复提交保护

**修复建议**:
```tsx
// 添加验证schema
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (e) => {
  e.preventDefault();
  if (isSubmitting) return;

  if (!emailRegex.test(email)) {
    setError(dictionary.auth.invalidEmail);
    return;
  }

  if (password.length < 8) {
    setError(dictionary.auth.passwordTooShort);
    return;
  }

  setIsSubmitting(true);
  try {
    await onLogin(email, password);
  } finally {
    setIsSubmitting(false);
  }
};
```

---

#### 3. AdminPanel组件过大 (中危)
**位置**: `AdminPanel.tsx` (2026行)

**问题**: 单个组件过于庞大,难以维护,性能差

**修复建议**: 拆分为多个子组件
```
components/admin/
  ├── AdminOverview.tsx
  ├── AdminSiteSettings.tsx
  ├── AdminPublishWorkspace.tsx
  ├── AdminMediaUpload.tsx
  ├── AdminContentLibrary.tsx
  ├── AdminInviteManager.tsx
  ├── AdminUserManager.tsx
  └── AdminAuditLogs.tsx
```

---

#### 4. 图片未优化 (中危)
**位置**: `ContentCard.tsx`, `ContentDetailView.tsx`, `HomeView.tsx`

**问题**: 使用原生`<img>`标签,没有响应式尺寸和懒加载优化

**修复建议**:
```tsx
import Image from 'next/image';

// 替换
<img src={coverUrl} alt={title} loading="lazy" />

// 为
<Image
  src={coverUrl}
  alt={title}
  width={600}
  height={400}
  placeholder="blur"
  blurDataURL="/placeholder.jpg"
  loading="lazy"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

---

## 📋 服务器检查清单

请使用以下命令手动检查服务器 (66.154.102.131):

### 1. 连接服务器
```bash
ssh root@66.154.102.131
# 密码: OiQmz25SSa
```

### 2. 检查Docker服务
```bash
cd /opt/rinana
docker compose ps
```

**预期输出**: 所有容器应为 `Up` 状态
- nginx
- frontend
- backend
- postgres
- redis
- minio

### 3. 检查后端日志
```bash
docker compose logs --tail=100 backend
```

**关注点**:
- 有无 `ERROR` 日志
- 数据库连接是否正常
- MinIO连接是否正常
- JWT token错误

### 4. 检查前端日志
```bash
docker compose logs --tail=50 frontend
```

**关注点**:
- Next.js编译错误
- API请求失败
- 渲染错误

### 5. 检查数据库
```bash
docker compose exec postgres psql -U postgres -d rinana
```

```sql
-- 检查用户数量
SELECT COUNT(*) FROM users;

-- 检查内容数量
SELECT
  (SELECT COUNT(*) FROM posts) as posts,
  (SELECT COUNT(*) FROM albums) as albums,
  (SELECT COUNT(*) FROM videos) as videos;

-- 检查媒体文件
SELECT COUNT(*), media_type FROM media_assets GROUP BY media_type;

-- 检查迁移状态
SELECT * FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;
```

### 6. 检查MinIO
```bash
docker compose exec minio mc ls local/rinana-media
```

### 7. 测试访问
```bash
# 测试首页
curl -I http://localhost

# 测试API
curl http://localhost/api/content
```

### 8. 重新部署 (如需要)
```bash
cd /opt/rinana

# 拉取最新代码
git pull origin main

# 重新构建并启动
docker compose down
docker compose up -d --build

# 查看启动日志
docker compose logs -f
```

### 9. 检查磁盘空间
```bash
df -h
du -sh /opt/rinana
docker system df
```

### 10. 检查网络
```bash
# 测试容器间通信
docker compose exec frontend ping -c 3 backend
docker compose exec backend ping -c 3 postgres
```

---

## 🎯 优先级建议

### 立即处理 (服务器检查后)
1. ✅ JSON注入漏洞 (已修复)
2. ✅ 媒体文件删除 (已修复)
3. 🔄 部署到服务器,验证修复
4. 🔄 检查服务器日志是否有错误

### 本周内处理
1. localStorage Token安全问题
2. 表单验证补全
3. AdminPanel组件拆分
4. N+1查询优化

### 迭代改进
1. 图片优化
2. 缓存一致性
3. 虚拟滚动
4. 无障碍优化

---

## 📊 代码质量评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 安全性 | B+ | 已修复JSON注入,但localStorage存token需改进 |
| 性能 | B | 存在N+1查询,需优化 |
| 可维护性 | B- | AdminPanel过大,需重构 |
| 代码质量 | B+ | 整体良好,有重复代码 |
| 用户体验 | B | UI优美,但表单验证不足 |

**总评**: B (良好,但需持续改进)
