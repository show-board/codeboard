# CodeBoard 技术细节及方案

## 运行环境

| 项目 | 值 |
|------|-----|
| 操作系统 | macOS (darwin 25.4.0) |
| Node.js | >= 20.x |
| 包管理器 | pnpm >= 9.x |
| 运行端口 | 2585（默认，可配置，冲突自动递增） |
| 监听地址 | 127.0.0.1（本地回环，安全） |

## 开发语言

- **前端**: TypeScript + React 18 + JSX
- **后端**: TypeScript（编译为 JS 运行）
- **CLI**: TypeScript + Commander.js
- **构建**: electron-vite（基于 Vite 6.x）

## 数据库选型

- **SQLite** (better-sqlite3) — 嵌入式数据库，无需额外服务
- WAL 模式支持并发读写
- 数据文件存储在 Electron userData 目录：`~/Library/Application Support/codeboard/data/codeboard.sqlite`
- 表结构：projects、sessions、task_updates、hook_events、memory_categories、memory_documents、user_settings、notifications

## API 服务架构

- Express.js 运行在**独立子进程**中（通过系统 Node.js spawn）
- 原因：Electron 内置 Node.js 的 ABI 与 better-sqlite3 native module 不兼容
- 主进程通过 HTTP fetch 调用 API 子进程
- Socket.IO 通过子进程 stdout 的 `[NOTIFY]` 协议传递事件到主进程

## 端口冲突处理

- 启动时从 2585 开始尝试，最多尝试 12 个端口（2585-2596）
- 端口被占用时自动递增，并将实际端口写入 settings

## 安全设计

- `contextBridge` 隔离渲染进程，禁用 `nodeIntegration`
- API 仅监听 127.0.0.1 本地回环，外部无法直接访问
- 记忆文件使用 MD5 哈希检测变更

## Hooks 采集方案（2026-04-10 新增）

- 新增 `hook_events` 表用于持久化多 Agent hooks 轨迹
- 新增 API：
  - `POST /api/hooks/events`：统一写入 hooks 事件（支持自动兜底创建 session）
  - `GET /api/hooks/sessions/:sessionId`：返回会话级统计 + 明细
- 统计口径（服务端自动分类）：
  - `mcp`
  - `tool_call`
  - `file_write`
  - `file_read`
  - `shell`
  - `session`
  - `subagent`
  - `compact`
  - `message`
  - `prompt`
  - `other`
- 全屏模式下右侧面板改为 hooks 统计视图：
  - 使用“概览卡 + 分类胶囊 + 高频 Hook 标签 + 明细区”的四段式布局
  - 分类胶囊覆盖所有 hooks 分类并支持动态扩展（未知分类自动显示）
  - 明细卡片支持 payload JSON 折叠查看，确保所有可传输字段可追踪

## hooks 自动补发策略（2026-04-10 调整）

- Cursor 脚本：`docs/hooks_templates/cursor/hooks/codeboard_cursor_event.sh`
  - `sessionStart` -> `session_start`（仅用于会话卡片创建）
  - 其他 hooks 仅上报 `/api/hooks/events`
- Claude 脚本：`docs/hooks_templates/claudecode/hooks/codeboard_claude_event.sh`
  - `SessionStart` -> `session_start`（仅用于会话卡片创建）
  - 其他 hooks 仅上报 `/api/hooks/events`
- OpenClaw 脚本：`docs/hooks_templates/openclaw/codeboard-dashboard/handler.ts`
  - `command:new/reset` -> `session_start`（仅用于会话卡片创建）
  - 其他 hooks 仅上报 `/api/hooks/events`

## 一键安装脚本（2026-04-10 新增）

- `scripts/install-hooks-cursor.sh`
- `scripts/install-hooks-claudecode.sh`
- `scripts/install-hooks-openclaw.sh`
- `scripts/install-hooks-all.sh`（自动检测环境并安装对应 Agent，可 `--all` 强制安装）

用途：降低多 Agent hooks 安装复杂度，统一模板来源并自动备份旧配置。

## task 语义说明（重要）

- 官方 hooks 并没有原生 `task_start/task_complete` 事件
- 当前策略：**不再用工具事件映射 task**
- `task_start/task_complete/session_complete` 由 Agent 按规划语义手动发送
- 完成时间 = Agent 手动上报 `task_complete` 的时间（服务端 `created_at`）
- 总结信息 = Agent 在 `task_summary` / `session_complete.summary` 中人工给出的语义总结

## 构建与打包

- 开发：`pnpm dev` → electron-vite dev
- 构建：`pnpm build` → electron-vite build
- 打包：`pnpm dist` → electron-builder 输出 .dmg/.zip
