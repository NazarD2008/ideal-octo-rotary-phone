# YATA / LiumaRat

YATA 是一个面向授权设备管理与测试场景的全栈 Android 远程管理方案。仓库包含后端服务、React 管理前端，以及位于 LIUMA 目录下的 Android 客户端。

## 功能范围

- 设备与会话管理
- 基于 WebSocket / Socket.IO 的实时通信
- 键盘事件采集与查看
- HVNC 风格的远程屏幕访问与控制
- 基于 OCR 的屏幕内容分析
- 可选的 ADB 辅助绕过能力，用于兼容性测试场景

## 目录说明

- backend/: Fastify + TypeScript 后端，负责 API、实时消息和数据存储
- frontend/: React + TypeScript 管理界面
- LIUMA/: Android 客户端源码与构建资源

## 快速开始

1. 安装根目录依赖：
   ```bash
   npm install
   ```
2. 启动后端：
   ```bash
   cd backend
   npm install
   npm run build
   npm run dev
   ```
3. 启动前端：
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. 构建 Android 客户端：
   ```bash
   cd LIUMA
   ./gradlew assembleDebug
   ```

## 说明

- 仅在获得明确授权的环境中使用本项目。
- 部署后请立即修改默认管理员账号和密码。
- 若使用远程屏幕功能，请确保 TURN/STUN 配置正确且可访问。

### TURN/STUN 配置

远程屏幕（HVNC/WebRTC）功能依赖 ICE 服务器配置。项目默认使用 `stun:stun.l.google.com:19302` 作为 STUN 服务器。

如果需要稳定的公网穿透能力，请配置自己的 TURN 服务器，并通过环境变量传给后端：

- `STUN_URL`：自定义 STUN 服务器地址，例如 `stun:stun.example.com:19302`。
- `TURN_HOST`：TURN 服务器主机名，例如 `turn.example.com`。
- `TURN_PORT`：TURN 服务器 UDP/TCP 端口，默认 `3478`。
- `TURN_TLS_PORT`：TURN/TLS 端口，默认 `5349`。
- `TURN_SECRET`：Coturn 共享密钥，必须是安全且长度足够的字符串。

示例：

```bash
export STUN_URL="stun:stun.l.google.com:19302"
export TURN_HOST="turn.example.com"
export TURN_PORT="3478"
export TURN_TLS_PORT="5349"
export TURN_SECRET="YOUR_SECURE_TURN_SECRET"
```

如果未配置 TURN，系统仍会返回默认 STUN 配置，但在受限 NAT/防火墙环境中可能无法正常建立远程屏幕连接。

生产环境建议使用自建 Coturn 服务，并确保 TURN_SECRET 严格保密。
