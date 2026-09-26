---
name: liumarat-experts
user-invocable: true
description: "Use when you need expert review or guidance for LiumaRAT across backend, frontend, Android, and security/auth domains. Includes focused investigation scope for each role."
---

# LiumaRAT Experts

## 何时使用
- 需要以明确专家角色审查或修复 LiumaRAT 的问题
- 需要区分后端、前端、Android 设备端、以及安全/认证领域的关注点
- 需要生成可复用的专业分析流程，而不是笼统的整体建议

## 专家角色与聚焦范围

### Backend 专家
- 聚焦 Fastify 后端实现
- 路由、服务、验证器、数据库访问和 schema
- 关注数据流、接口契约、异常处理与性能
- 主要检查目录：`backend/src/routes`, `backend/src/services`, `backend/src/validators`, `backend/src/db`, `backend/src/middleware`

### Frontend 专家
- 聚焦 React + Vite 前端页面与状态管理
- 页面结构、数据流、组件状态、API 调用、UI 展示
- 关注用户交互、可访问性、错误反馈与前端缓存/刷新机制
- 主要检查目录：`frontend/src/pages`, `frontend/src/hooks`, `frontend/src/services`, `frontend/src/components`, `frontend/src/store`

### Android 专家
- 聚焦 LIUMA 应用与设备侧行为
- 设备授权流程、任务执行、远程控制、ADB bypass 源码逻辑
- 关注 Android 生命周期、权限申请、安全边界、设备端日志
- 主要检查目录：`LIUMA/app/src/main`, `LIUMA/adbBypass`（若存在相关实现）

### Security / Auth 专家
- 聚焦 device auth、ADB 策略、权限绑定、认证/授权边界
- 关注设备身份、令牌管理、会话保护、权限提升风险、策略一致性
- 主要检查目录：`backend/src/services/deviceAuth.ts`, `backend/src/utils/turnAuth.ts`, `backend/src/middleware/auth.ts`, 与相关配置文件

## 使用流程
1. 确定问题域：后端、前端、Android, 或 安全/认证。
2. 以对应专家角色阅读相关代码路径，定位最小影响范围。
3. 若问题跨域，明确依赖链并说明哪一层负责哪一部分。
4. 优先保留现有项目约定，避免在一处修复时引入另一层破坏。
5. 提供简明结论：Root cause、影响文件、修复建议、验证方式。

## 验证检查
- 已识别具体领域和对应文件路径
- 是否复用了已有服务/路由约定而非新增无关逻辑
- 是否保留跨层接口契约一致性
- 是否说明验证或测试命令，例如后端构建、前端编译或 Android 项目检查

## 示例用法
- 作为 `liumarat-specialist` 的补充，针对某个问题选择最适专家视角。
- 用于将复杂 bug 分解为“Backend / Frontend / Android / Security”四条路径。
- 生成跨层分析报告，明确哪个领域负责最终修复。
