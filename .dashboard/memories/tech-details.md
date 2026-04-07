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
- 表结构：projects、sessions、task_updates、memory_categories、memory_documents、user_settings、notifications

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

## 构建与打包

- 开发：`pnpm dev` → electron-vite dev
- 构建：`pnpm build` → electron-vite build
- 打包：`pnpm dist` → electron-builder 输出 .dmg/.zip
