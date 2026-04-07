# CodeBoard 架构说明

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Electron | 33.x |
| 前端框架 | React + TypeScript | 18.x |
| 构建工具 | electron-vite + Vite | 2.x / 6.x |
| UI 样式 | Tailwind CSS | 3.4.x |
| 动画库 | Framer Motion | 11.x |
| 状态管理 | Zustand | 5.x |
| 后端 API | Express.js | 4.x |
| 实时通信 | Socket.IO | 4.x |
| 数据库 | SQLite (better-sqlite3) | - |
| CLI | Commander.js | 13.x |
| 图标库 | Lucide React | - |

## 架构总览

```
┌─────────────────────────────────────────────────┐
│              Electron Desktop App                │
│  ┌────────────┐  ┌───────────────────────────┐  │
│  │ Main Process│  │    Renderer Process       │  │
│  │             │  │  ┌─────────────────────┐  │  │
│  │ Express API │←→│  │   React + Zustand   │  │  │
│  │  :2585     │  │  │   + Framer Motion    │  │  │
│  │             │  │  └─────────────────────┘  │  │
│  │ Socket.IO  │→→│                            │  │
│  │             │  └───────────────────────────┘  │
│  │ SQLite DB  │                                  │
│  │             │                                  │
│  │ System     │                                  │
│  │ Notification│                                 │
│  │ Tray Icon  │                                  │
│  └────────────┘                                  │
└─────────────────────────────────────────────────┘
        ↑ HTTP API
        │
  ┌─────┴──────┐      ┌───────────┐
  │ AI Agents  │      │ codeboard │
  │ (Cursor,   │      │ CLI Tool  │
  │ Claude Code)│     └───────────┘
  └────────────┘
```

## 数据流

1. **Agent → API**: Agent 通过 HTTP POST 推送任务状态更新
2. **API → SQLite**: Express 路由处理请求，更新数据库
3. **API → Socket.IO**: 广播实时事件给所有连接的客户端
4. **Socket.IO → Renderer**: 前端 Socket.IO 客户端接收事件
5. **Main → Renderer**: 通过 IPC 转发事件给 React UI
6. **Main → System**: 调用 Electron API 发送系统通知
7. **Renderer → Main**: 通过 IPC invoke 读取数据库数据

## 目录结构说明

- `electron/main/` - Electron 主进程代码
  - `db/` - SQLite 数据库封装
  - `server/` - Express API 服务器
  - `services/` - 通知、记忆、推荐等服务
- `src/` - React 渲染进程代码
  - `components/` - UI 组件
  - `stores/` - Zustand 状态管理
  - `hooks/` - React Hooks
- `cli/` - CLI 命令行工具
- `skills/` - AI Agent Skills
  - `skills/codeboard/` — 看板对接主 Skill（`SKILL.md` + `references/`）
  - `skills/install-codeboard-skills/` — 指导将 Skill **符号链接**到 `~/.cursor/skills/` 的安装说明
- `.cursor/rules/codeboard.md` — Cursor **alwaysApply** 规则示例（可复制到业务项目）
- `data/` - 运行时数据（SQLite + 记忆文件）

## 安全设计

- 使用 `contextBridge` 隔离渲染进程，禁用 `nodeIntegration`
- API 监听 127.0.0.1 本地回环地址，外部无法直接访问
- 数据库使用 WAL 模式支持并发读写
- 记忆文件使用 MD5 哈希检测变更
