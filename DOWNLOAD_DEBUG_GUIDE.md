# APK 下载错误排查指南

## 📊 当前状态

根据诊断报告，您的系统状态：

```
✅ 构建记录: 1 个已完成
✅ APK 数据: 43.07 MB
✅ 构建工具: 全部就位
✅ 代码修复: Content-Disposition 头错误已解决
```

---

## 🔧 已解决的问题

### 1. **HTTP 头编码错误** ✅ FIXED
**错误信息：**
```
ERROR: Invalid character in header content ["content-disposition"]
```

**原因:** 中文文件名直接放在 HTTP 头中导致非 ASCII 字符错误

**解决方案:** 已在 `backend/src/routes/builder.ts` 中实现 RFC 5987 编码
- 为旧版浏览器保留 ASCII 备选文件名
- 为现代浏览器使用 UTF-8 编码的文件名

---

## 🛠️ 排查步骤

### 步骤 1：确保后端运行中

```bash
cd /workspaces/LiumaRAT/backend
npm run dev
```

您应该看到类似的输出：
```
[Server] Listening on http://0.0.0.0:3000
[Database] Connected successfully
```

### 步骤 2：验证用户认证

打开浏览器控制台，测试认证端点：

```javascript
// 登录
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'password' }),
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log('Login:', data));

// 验证用户信息
fetch('/api/auth/me', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log('User Info:', data));
```

**预期结果：**
- ✅ Login: `{ success: true, data: { id, username, role, permissions } }`
- ✅ User Info: `{ success: true, data: { username, role, permissions } }`

### 步骤 3：检查构建记录

```javascript
// 查看最近的构建记录
fetch('/api/logs?type=SYSTEM&limit=50', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log('Logs:', data));
```

### 步骤 4：测试 APK 下载

```javascript
// 下载 APK
fetch('/api/builder/download', {
  credentials: 'include'
})
.then(r => {
  console.log('Response Status:', r.status);
  console.log('Response Headers:', {
    'content-type': r.headers.get('content-type'),
    'content-disposition': r.headers.get('content-disposition'),
    'content-length': r.headers.get('content-length')
  });
  
  if (r.ok) {
    return r.blob().then(blob => {
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'TestAPK.apk';
      a.click();
      URL.revokeObjectURL(url);
      console.log('✅ APK 下载成功');
    });
  } else {
    return r.json().then(err => console.error('❌ 错误:', err));
  }
})
.catch(err => console.error('Network Error:', err));
```

---

## 🔍 常见问题诊断

### 问题 1: 仍然收到 401 (Unauthorized)

**原因：**
- ❌ 未登录或 Token 过期
- ❌ Token 未在 Cookie 中保存

**解决方案：**
1. 清除浏览器缓存和 Cookies
2. 重新登录
3. 检查浏览器 DevTools → Application → Cookies 是否有 `token`

### 问题 2: 收到 500 错误

**可能原因：**
```javascript
// 在浏览器控制台运行以诊断
fetch('/api/builder/download', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log(data));
  // 会显示具体的错误信息
```

**常见原因：**
- ❌ 没有完成的构建记录 → 需要运行 `/api/builder/build`
- ❌ APK 数据为空 → 需要重新构建
- ❌ 数据库中的文件已损坏 → 清除构建记录并重新构建

### 问题 3: APK 下载后文件损坏

**原因：** 可能是构建过程中断

**解决方案：**
```bash
# 运行诊断脚本检查 APK 数据完整性
cd /workspaces/LiumaRAT/backend
npx tsx diagnose-build.ts

# 检查 "APK Data Size" 是否为 0 或很小
# 如果数据损坏，需要重新构建
```

---

## 📝 手动测试构建流程

如果需要验证完整流程：

```javascript
// 1. 准备构建表单
const formData = new FormData();
formData.append('appName', 'TestApp2');
formData.append('packageName', 'com.test.app');
formData.append('serverUrl', 'http://127.0.0.1:32766');
formData.append('homePageUrl', 'https://google.com');
formData.append('versionName', '1.0.0');

// 2. 开始构建（注意：会运行 java 进程，耗时 2-5 分钟）
fetch('/api/builder/build', {
  method: 'POST',
  credentials: 'include',
  body: formData
})
.then(r => r.json())
.then(data => console.log('Build started:', data));

// 3. 监听进度（WebSocket）
const ws = new WebSocket('ws://localhost:3000');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'builder:progress') {
    console.log('Progress:', data.data);
  }
};

// 4. 构建完成后，运行诊断脚本验证
// npx tsx diagnose-build.ts
```

---

## 📞 获取更多日志信息

### 后端日志
```bash
# 查看实时日志
cd /workspaces/LiumaRAT/backend
npm run dev

# 日志会显示以下信息：
# [Builder] Downloading APK: ...
# [Builder] Download error: ...
```

### 浏览器日志
- **F12 → Console**: 查看 JavaScript 错误
- **F12 → Network**: 查看 API 请求和响应
- **F12 → Application**: 检查 Cookies 和 localStorage

### 数据库日志
```bash
# 查看最近 50 条日志
cd /workspaces/LiumaRAT/backend
node -e "
const { initDb } = require('./dist/src/db/index.js');
const { logs } = require('./dist/src/db/schema.js');
const { desc } = require('drizzle-orm');

initDb();
const db = require('./dist/src/db/index.js').getDb();
const result = db.select().from(logs).orderBy(desc(logs.id)).limit(50).all();
console.log(JSON.stringify(result, null, 2));
"
```

---

## ✅ 验证修复成功

修复成功的标志：

1. ✅ 诊断脚本显示 "✅ 1 completed build(s) available"
2. ✅ `/api/builder/download` 返回 200 状态码
3. ✅ Response Headers 中有正确的 `Content-Disposition`
4. ✅ 浏览器能正常下载 APK 文件
5. ✅ 下载的 APK 文件大小 > 40 MB

---

## 📚 相关文件

- 修复代码: [backend/src/routes/builder.ts](../backend/src/routes/builder.ts#L112-L119)
- 诊断脚本: [backend/diagnose-build.ts](../backend/diagnose-build.ts)
- API 规范: [backend/src/routes/builder.ts#L563](../backend/src/routes/builder.ts#L563)

