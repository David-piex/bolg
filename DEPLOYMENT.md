# 🌸 服务器部署和优化指南

## 📋 服务器信息
- IP: 66.154.102.131
- 配置: 4核心 4G内存
- 密码: OiQmz25SSa
- 站长密码: admin123456

---

## 🚀 立即部署最新版本

### 1. 连接服务器
```bash
ssh root@66.154.102.131
# 输入密码: OiQmz25SSa
```

### 2. 拉取最新代码
```bash
cd /opt/rinana
git pull origin main
```

### 3. 重新构建和部署
```bash
# 停止现有服务
docker compose down

# 清理旧镜像(可选,节省空间)
docker system prune -af

# 重新构建并启动
docker compose up -d --build

# 查看启动日志
docker compose logs -f
```

### 4. 验证部署
```bash
# 检查所有容器状态
docker compose ps

# 应该看到以下容器都是Up状态:
# - nginx
# - frontend
# - backend
# - postgres
# - redis
# - minio
```

---

## 🎨 本次更新内容

### UI优化 (更可爱更女性化)
✨ **配色方案**
- 主色: `#ff69b4` (Hot Pink 热粉色)
- 背景: 柔和粉色渐变 + 放射状光晕效果
- 强调色: `#ffa6d5` (浅粉), `#b088f9` (淡紫)

✨ **动画效果**
- 导航栏淡入动画 (0.4秒弹性缓动)
- 按钮悬停闪光效果
- 卡片悬停上浮放大
- Logo悬停旋转缩放
- 所有交互都有柔和过渡

✨ **圆角优化**
- 导航栏: 28px (超级圆润)
- 按钮: 24px (胶囊形状)
- 卡片: 20px (柔和边缘)
- 输入框: 14px (温柔)

✨ **中文优化**
- 字体优先级: PingFang SC → Microsoft YaHei → Hiragino Sans GB
- 行高增加到1.7,阅读更舒适
- 字间距0.02em,更优雅

### 性能优化 (适配4G内存)
⚡ **图片优化**
- 自动转换为WebP/AVIF格式 (体积减少70%)
- 响应式尺寸,移动端加载小图
- 懒加载 + 渐进式加载

⚡ **构建优化**
- 启用CSS优化和tree-shaking
- 生产环境移除console.log
- 启用Gzip压缩
- SWC最小化代码

⚡ **内存优化**
- 减少构建时内存占用
- 图片缓存60秒
- 优化依赖打包

### Bug修复
🐛 **安全修复**
- 修复JSON注入漏洞
- 使用ObjectMapper安全序列化

🐛 **功能修复**
- 删除内容时同步删除MinIO媒体文件
- 添加智能检测,避免删除被引用的媒体

🐛 **新功能**
- Logo自定义上传功能

---

## 📊 性能提升预期

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 图片体积 | 原始大小 | WebP压缩 | 70%↓ |
| 首屏加载 | ~900KB | ~500KB | 44%↓ |
| 内存占用 | 基准 | 优化后 | 30%↓ |
| 构建时间 | 基准 | 优化后 | 20%↓ |

---

## 🔍 检查清单

### 检查1: 容器状态
```bash
docker compose ps
```
**期望**: 所有容器状态为 `Up`

### 检查2: 后端健康检查
```bash
curl -I http://localhost/api/content
```
**期望**: 返回 `HTTP/1.1 200 OK`

### 检查3: 前端访问
```bash
curl -I http://localhost
```
**期望**: 返回 `HTTP/1.1 200 OK`

### 检查4: 数据库连接
```bash
docker compose logs backend | grep -i "database\|postgres"
```
**期望**: 没有连接错误

### 检查5: MinIO连接
```bash
docker compose logs backend | grep -i "minio"
```
**期望**: 没有连接错误

### 检查6: 数据库迁移
```bash
docker compose exec postgres psql -U postgres -d rinana -c "SELECT version FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 1;"
```
**期望**: 显示版本 `5` (最新的Logo迁移)

### 检查7: 磁盘空间
```bash
df -h /
du -sh /opt/rinana
docker system df
```
**期望**:
- 根分区剩余 > 2GB
- 项目目录 < 2GB
- Docker镜像 < 4GB

### 检查8: 内存使用
```bash
free -h
docker stats --no-stream
```
**期望**:
- 可用内存 > 500MB
- 单个容器内存 < 800MB

---

## 🎯 性能监控命令

### 实时日志
```bash
# 查看所有服务日志
docker compose logs -f --tail=50

# 只看后端
docker compose logs -f backend --tail=100

# 只看前端
docker compose logs -f frontend --tail=100

# 只看错误
docker compose logs | grep -i "error\|exception\|fail"
```

### 性能监控
```bash
# 容器资源使用
watch -n 5 'docker stats --no-stream'

# 系统资源
htop

# 网络连接
netstat -tulpn | grep -E ":(80|443|8080|5432|6379|9000)"
```

---

## 🚨 常见问题排查

### 问题1: 前端构建失败
**症状**: frontend容器反复重启
```bash
docker compose logs frontend | tail -100
```

**可能原因**:
- 内存不足 → 重启Docker,清理缓存
- 依赖安装失败 → 检查网络

**解决**:
```bash
docker compose down
docker system prune -f
docker compose up -d --build
```

### 问题2: 后端启动慢
**症状**: 后端日志停在"Starting..."

**可能原因**:
- 等待数据库初始化
- JVM启动慢

**解决**: 耐心等待3-5分钟,或检查:
```bash
docker compose logs postgres | tail -50
```

### 问题3: 图片加载404
**症状**: 上传的图片无法显示

**检查**:
```bash
docker compose logs minio | tail -50
docker compose exec minio mc ls local/rinana-media
```

### 问题4: 内存不足
**症状**: 系统卡顿,容器被kill

**解决**:
```bash
# 查看内存大户
docker stats --no-stream

# 重启占用过多的服务
docker compose restart frontend

# 最后手段:重启所有
docker compose restart
```

---

## 💾 数据库维护

### 备份数据库
```bash
docker compose exec postgres pg_dump -U postgres rinana > backup_$(date +%Y%m%d).sql
```

### 查看数据统计
```bash
docker compose exec postgres psql -U postgres -d rinana << EOF
SELECT 'users' as table, COUNT(*) FROM users
UNION ALL
SELECT 'posts', COUNT(*) FROM posts
UNION ALL
SELECT 'albums', COUNT(*) FROM albums
UNION ALL
SELECT 'videos', COUNT(*) FROM videos
UNION ALL
SELECT 'media_assets', COUNT(*) FROM media_assets;
EOF
```

### 清理已删除内容
```bash
docker compose exec postgres psql -U postgres -d rinana << EOF
-- 查看删除的内容数量
SELECT 'deleted_posts' as type, COUNT(*) FROM posts WHERE status = 'DELETED'
UNION ALL
SELECT 'deleted_albums', COUNT(*) FROM albums WHERE status = 'DELETED'
UNION ALL
SELECT 'deleted_videos', COUNT(*) FROM videos WHERE status = 'DELETED';

-- 如果要永久删除(谨慎!):
-- DELETE FROM posts WHERE status = 'DELETED' AND updated_at < NOW() - INTERVAL '30 days';
EOF
```

---

## 🔐 安全建议

1. **修改默认密码**
```bash
# 修改root密码
passwd

# 修改数据库密码(在docker-compose.yml中)
# 然后重新部署
```

2. **配置防火墙**
```bash
# 只开放必要端口
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

3. **启用自动更新**
```bash
apt install unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

4. **定期备份**
```bash
# 添加cron任务
crontab -e

# 每天凌晨3点备份
0 3 * * * cd /opt/rinana && docker compose exec postgres pg_dump -U postgres rinana > /backups/db_$(date +\%Y\%m\%d).sql
```

---

## 📈 下一步优化建议

### 优先级1 (本周完成)
- [ ] 配置HTTPS证书
- [ ] 设置自动备份
- [ ] 添加监控告警

### 优先级2 (本月完成)
- [ ] 优化Nginx缓存配置
- [ ] 配置CDN加速
- [ ] 添加Redis持久化

### 优先级3 (长期)
- [ ] 实现自动扩容
- [ ] 添加日志收集系统
- [ ] 性能监控大盘

---

## 📞 技术支持

遇到问题时的调试顺序:
1. 检查容器状态: `docker compose ps`
2. 查看日志: `docker compose logs [service]`
3. 检查资源: `docker stats`, `free -h`, `df -h`
4. 测试连接: `curl http://localhost`
5. 检查数据库: 连接psql查询

**日志位置**:
- Docker日志: `docker compose logs`
- Nginx日志: `docker compose logs nginx`
- 应用日志: 容器内部

祝部署顺利! 🎉
