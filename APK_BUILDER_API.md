# LiumaRAT APK Builder API 文档

## 概述

LiumaRAT APK Builder API 提供完整的 APK 构建和下载功能。所有 API 端点都需要 JWT 认证，并且要求用户拥有 `builder:access` 权限。

**API 基础 URL:** `http://localhost:32766/api` (开发环境)

**认证方式:** Bearer Token (JWT)

**内容类型:** `application/json` 或 `multipart/form-data`

---

## 认证

### 1. 登录获取 Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "s20041021"
}
```

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "username": "admin",
    "email": "admin@liuma.com",
    "role": "admin",
    "permissions": [
      "builder:access",
      "dashboard:view",
      ...
    ]
  }
}
```

### 2. 在请求中使用 Token

```http
GET /api/builder/download
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## API 端点

### 1. 构建 APK

创建新的 APK 构建任务。

#### 请求

```http
POST /api/builder/build
Authorization: Bearer <token>
Content-Type: multipart/form-data

serverUrl=http://127.0.0.1:32766
homePageUrl=https://google.com
appName=TestAPK
packageName=com.example.app
versionName=1.0.0
adbAssistBypassMode=disabled
appIcon=<binary_file>
```

#### 请求参数

| 参数 | 类型 | 必需 | 范围 | 说明 |
|------|------|------|------|------|
| `serverUrl` | string | 是 | - | APK 连接的服务器地址，必须是有效的 URL (http/https) |
| `homePageUrl` | string | 是 | - | APK 启动时加载的主页地址，必须是有效的 URL |
| `appName` | string | 是 | 1-50 | 应用在系统中显示的名称 |
| `packageName` | string | 是 | - | Android 包名，格式必须符合 `[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+` |
| `versionName` | string | 是 | - | 应用版本号，格式必须符合 `[0-9]+(\.[0-9]+)*([\-_a-zA-Z0-9]+)?` |
| `adbAssistBypassMode` | string | 否 | enabled, disabled | 是否启用 ADB Assist 高级绕过功能，默认 disabled |
| `appIcon` | file | 否 | <= 5MB | 应用图标，支持 PNG、JPEG、WebP 格式 |

#### 参数验证规则

**serverUrl 和 homePageUrl:**
```regex
^https?:\/\/.+
```

**appName:**
- 长度范围: 1 到 50 字符
- 不能为空或只包含空格

**packageName:**
```regex
^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$
```

示例：`com.example.app`、`io.github.user.myapp`

**versionName:**
```regex
^[0-9]+(\.[0-9]+)*([\-_a-zA-Z0-9]+)?$
```

示例：`1.0.0`、`2.1`、`1.0.0-alpha`、`1.0.0_rc1`

**appIcon:**
- 格式: PNG、JPEG、WebP
- 最大大小: 5 MB
- 若上传，将被缩放并用作应用图标

#### 响应

**成功 (200):**
```json
{
  "success": true,
  "message": "Build started"
}
```

**验证失败 (400):**
```json
{
  "success": false,
  "error": "Invalid server URL"
}
```

可能的错误信息：
- `Invalid server URL` - 服务器地址格式不正确
- `Invalid home page URL` - 主页地址格式不正确
- `App name is required` - 应用名称为空
- `App name must be 50 characters or less` - 应用名称过长
- `Package name is required` - 包名为空
- `Invalid package name "..."` - 包名格式不正确
- `Version name is required` - 版本号为空
- `Invalid version name "..."` - 版本号格式不正确
- `Icon file too large` - 图标文件超过 5MB

**无权限 (403):**
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

**构建进行中 (409):**
```json
{
  "success": false,
  "error": "A build is already in progress"
}
```

#### 异步处理

构建是异步的。请求返回后，应用会在后台执行以下步骤：

1. 检查前置条件 (Java, 工具)
2. 反编译基础 APK
3. 修补配置
4. 重建 APK
5. 签名
6. 存储到数据库

整个过程通常耗时 30-40 秒。

#### 进度推送

构建过程中，服务器会通过 Socket.IO 推送进度事件。详见 [Socket.IO 事件](#socketio-事件) 部分。

#### 用法示例

**curl:**
```bash
TOKEN="your-jwt-token"
curl -X POST http://localhost:32766/api/builder/build \
  -H "Authorization: Bearer $TOKEN" \
  -F 'serverUrl=http://127.0.0.1:32766' \
  -F 'homePageUrl=https://google.com' \
  -F 'appName=MyApp' \
  -F 'packageName=com.example.myapp' \
  -F 'versionName=1.0.0'
```

**JavaScript:**
```javascript
const formData = new FormData();
formData.append('serverUrl', 'http://127.0.0.1:32766');
formData.append('homePageUrl', 'https://google.com');
formData.append('appName', 'MyApp');
formData.append('packageName', 'com.example.myapp');
formData.append('versionName', '1.0.0');

const response = await fetch('http://localhost:32766/api/builder/build', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
if (result.success) {
  console.log('Build started!');
} else {
  console.error('Build failed:', result.error);
}
```

**Python:**
```python
import requests

headers = {
    'Authorization': f'Bearer {token}'
}

files = {
    'serverUrl': (None, 'http://127.0.0.1:32766'),
    'homePageUrl': (None, 'https://google.com'),
    'appName': (None, 'MyApp'),
    'packageName': (None, 'com.example.myapp'),
    'versionName': (None, '1.0.0')
}

response = requests.post(
    'http://localhost:32766/api/builder/build',
    headers=headers,
    files=files
)

if response.json()['success']:
    print('Build started!')
else:
    print('Error:', response.json()['error'])
```

---

### 2. 取消构建

取消正在进行的 APK 构建。

#### 请求

```http
POST /api/builder/cancel
Authorization: Bearer <token>
```

#### 响应

**成功 (200):**
```json
{
  "success": true,
  "message": "Build cancellation requested"
}
```

**无构建进行中 (404):**
```json
{
  "success": false,
  "error": "No build in progress"
}
```

#### 说明

- 发送取消请求后，所有子进程会被杀死
- 已启动的构建步骤会继续完成
- 分配的设备注册令牌会被撤销

#### 用法示例

```bash
curl -X POST http://localhost:32766/api/builder/cancel \
  -H "Authorization: Bearer $TOKEN"
```

---

### 3. 下载 APK

下载最新构建的 APK 文件。

#### 请求

```http
GET /api/builder/download
Authorization: Bearer <token>
```

#### 响应

**成功 (200):**
```
Content-Type: application/vnd.android.package-archive
Content-Disposition: attachment; filename="TestAPK.apk"
Content-Length: 46137344

<binary APK data>
```

**无 APK 可用 (404):**
```json
{
  "success": false,
  "error": "No APK built yet"
}
```

#### 说明

- 返回最新的已完成构建的 APK
- 每次请求都返回最新的构建产物
- 浏览器会自动下载为 `<appName>.apk`

#### 下载进度追踪

支持 HTTP Range 请求和进度事件：

```javascript
fetch('http://localhost:32766/api/builder/download', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(response => {
  const total = parseInt(response.headers.get('content-length'), 10);
  let current = 0;
  
  return response.blob().then(blob => {
    const reader = blob.stream().getReader();
    
    return new Promise((resolve, reject) => {
      const push = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            resolve(blob);
            return;
          }
          
          current += value.byteLength;
          console.log(`Downloaded: ${((current / total) * 100).toFixed(2)}%`);
          push();
        }).catch(reject);
      };
      
      push();
    });
  });
})
.then(blob => {
  // 下载完成，创建下载链接
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'app.apk';
  a.click();
})
.catch(console.error);
```

#### 用法示例

**curl:**
```bash
TOKEN="your-jwt-token"
curl -X GET http://localhost:32766/api/builder/download \
  -H "Authorization: Bearer $TOKEN" \
  -o downloaded.apk \
  -L
```

**JavaScript (前端):**
```javascript
async function downloadAPK() {
  const token = localStorage.getItem('auth-token');
  
  const response = await fetch('http://localhost:32766/api/builder/download', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Download failed');
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'MyApp.apk';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
```

**Python:**
```python
import requests

headers = {'Authorization': f'Bearer {token}'}
response = requests.get(
    'http://localhost:32766/api/builder/download',
    headers=headers
)

if response.status_code == 200:
    with open('downloaded.apk', 'wb') as f:
        f.write(response.content)
    print(f'Downloaded: {len(response.content)} bytes')
else:
    print('Error:', response.json()['error'])
```

---

## Socket.IO 事件

### 概述

构建过程中，服务器通过 Socket.IO 推送实时进度。客户端需要建立 WebSocket 连接来接收这些事件。

### 连接

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:32766', {
  extraHeaders: {
    'Authorization': `Bearer ${token}`
  }
});

socket.on('connect', () => {
  console.log('Connected to builder service');
});

socket.on('disconnect', () => {
  console.log('Disconnected from builder service');
});
```

### 事件: builder:progress

构建过程中推送的实时进度信息。

#### 消息格式

```json
{
  "step": "checking|decompiling|patching|building|signing",
  "message": "Decompiling base APK with apktool...",
  "complete": false,
  "error": null,
  "time": "2026-08-12T13:56:25.000Z",
  "appName": "TestAPK"
}
```

#### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `step` | string | 当前构建步骤 |
| `message` | string | 步骤的详细信息 |
| `complete` | boolean | 是否已完成（包括成功和失败） |
| `error` | string \| null | 错误信息（如果失败），成功时为 null |
| `time` | string | ISO 格式的时间戳 |
| `appName` | string | 应用名称 |

#### 步骤流程

| 步骤 | complete | error | 说明 |
|------|----------|-------|------|
| checking | false | null | 正在检查前置条件 |
| decompiling | false | null | 正在反编译 APK |
| patching | false | null | 正在修补配置 |
| building | false | null | 正在重建 APK |
| signing | false | null | 正在签名 |
| signing | true | null | **构建成功完成** |
| checking/... | true | "Error message" | **构建失败** |

#### 监听示例

```javascript
socket.on('builder:progress', (progress) => {
  console.log(`[${progress.step}] ${progress.message}`);
  
  if (progress.complete) {
    if (progress.error) {
      console.error(`Build failed: ${progress.error}`);
    } else {
      console.log('Build completed successfully!');
      // 现在可以调用 /api/builder/download 下载 APK
    }
  }
});
```

#### 进度条示例

```javascript
const steps = ['checking', 'decompiling', 'patching', 'building', 'signing'];
let currentStepIndex = 0;

socket.on('builder:progress', (progress) => {
  const stepIndex = steps.indexOf(progress.step);
  
  if (stepIndex >= 0) {
    currentStepIndex = stepIndex;
  }
  
  const percent = ((currentStepIndex + 0.5) / steps.length) * 100;
  console.log(`Progress: ${Math.round(percent)}%`);
  
  // 更新 UI 进度条
  updateProgressBar(percent, progress.message);
});
```

---

## 错误处理

### 常见 HTTP 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数无效 |
| 401 | 未认证（token 缺失或无效） |
| 403 | 权限不足（缺少 builder:access） |
| 404 | 资源不存在（无可用 APK） |
| 409 | 冲突（已有构建进行中） |
| 500 | 服务器内部错误 |

### 错误响应示例

```json
{
  "success": false,
  "error": "Invalid package name \"com.invalid-name\". Must be lowercase..."
}
```

### 错误处理最佳实践

```javascript
async function buildAPK(config) {
  try {
    const response = await fetch('/api/builder/build', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: config
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      // 处理 HTTP 错误
      console.error(`HTTP ${response.status}: ${result.error}`);
      
      if (response.status === 401) {
        // Token 过期，需要重新登录
        redirectToLogin();
      } else if (response.status === 400) {
        // 参数验证失败，显示给用户
        showError(`参数错误: ${result.error}`);
      } else if (response.status === 409) {
        // 已有构建进行中
        showWarning('已有构建进行中，请等待完成');
      }
      
      return;
    }
    
    // 构建成功启动
    console.log('Build started successfully');
    
    // 监听进度
    socket.on('builder:progress', handleProgress);
    
  } catch (error) {
    // 网络错误
    console.error('Network error:', error.message);
    showError('网络连接失败');
  }
}
```

---

## 速率限制

当前无速率限制，但建议实现以下限制策略：

- 每个用户每分钟最多 10 个构建请求
- 构建过程不支持并发，同一时间只能进行一个构建

建议在客户端加入防抖和状态检查：

```javascript
let isBuilding = false;

async function startBuild(config) {
  if (isBuilding) {
    console.warn('Build already in progress');
    return;
  }
  
  isBuilding = true;
  
  try {
    const response = await fetch('/api/builder/build', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: config
    });
    
    if (response.ok) {
      // 等待构建完成
      await waitForBuildCompletion();
    }
  } finally {
    isBuilding = false;
  }
}

function waitForBuildCompletion() {
  return new Promise((resolve, reject) => {
    socket.once('builder:progress', (progress) => {
      if (progress.complete) {
        resolve(progress);
      }
    });
  });
}
```

---

## 数据库存储

构建的 APK 文件存储在 SQLite 数据库中的 `build_records` 表。

### 表结构

```sql
CREATE TABLE build_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_url TEXT NOT NULL,
  home_page_url TEXT NOT NULL,
  app_name TEXT NOT NULL DEFAULT '亚太科技',
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  apk_data BLOB,
  file_size INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
```

### 查询示例

```sql
-- 获取最新的成功构建
SELECT * FROM build_records 
WHERE status = 'completed' 
ORDER BY id DESC 
LIMIT 1;

-- 统计所有构建
SELECT COUNT(*) as total_builds,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
       COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM build_records;

-- 计算总的数据大小
SELECT SUM(file_size) / 1024 / 1024 as total_size_mb
FROM build_records;
```

---

## 最佳实践

### 1. 参数验证

始终在客户端进行基本验证，减少无效请求：

```javascript
function validatePackageName(name) {
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(name);
}

function validateVersionName(version) {
  return /^[0-9]+(\.[0-9]+)*([\-_a-zA-Z0-9]+)?$/.test(version);
}
```

### 2. 错误恢复

实现自动重试机制（仅针对 5xx 错误）：

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status < 500) {
        return response;
      }
      // 5xx 错误，等待后重试
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
}
```

### 3. Token 管理

实现 Token 刷新机制：

```javascript
async function getValidToken() {
  let token = localStorage.getItem('auth-token');
  const expiry = localStorage.getItem('auth-token-expiry');
  
  if (!token || Date.now() > expiry) {
    // Token 已过期或不存在，重新登录
    token = await refreshToken();
    localStorage.setItem('auth-token', token);
    localStorage.setItem('auth-token-expiry', Date.now() + 24 * 60 * 60 * 1000);
  }
  
  return token;
}
```

### 4. 超时处理

为 fetch 请求设置超时：

```javascript
function fetchWithTimeout(url, options, timeout = 30000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
}
```

### 5. 进度持久化

在 localStorage 中保存构建进度，便于页面刷新后恢复：

```javascript
socket.on('builder:progress', (progress) => {
  // 保存当前进度
  localStorage.setItem('last-build-progress', JSON.stringify(progress));
  
  if (progress.complete) {
    // 构建完成，清理临时数据
    localStorage.removeItem('last-build-progress');
  }
});

// 页面加载时恢复
window.addEventListener('load', () => {
  const lastProgress = JSON.parse(localStorage.getItem('last-build-progress') || 'null');
  if (lastProgress && !lastProgress.complete) {
    console.log('Resuming from last progress:', lastProgress);
  }
});
```

---

## 常见问题

### Q: 如何知道构建是否完成?

A: 监听 Socket.IO `builder:progress` 事件，当 `complete` 为 `true` 时表示完成。

### Q: 下载链接多久有效?

A: 永久有效。APK 存储在数据库中，可随时下载最新的已完成构建。

### Q: 能否构建多个 APK 同时进行?

A: 当前不支持。如果尝试在构建进行中再次请求，会返回 409 冲突错误。

### Q: 如何追踪特定应用的所有构建?

A: 数据库中的 `appName` 字段可用于查询。但 API 目前不提供查询历史的端点，需要直接访问数据库。

### Q: APK 文件的大小通常是多少?

A: 约 40-50 MB，具体取决于基础 APK 的大小和是否上传了自定义图标。

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2026-08-12 | 初始版本 |

