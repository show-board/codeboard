# CodeBoard 项目开发结构

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

## 目录结构

```
codeboard/
├── electron/                   # Electron 主进程
│   ├── main/
│   │   ├── index.ts            # 主进程入口（窗口管理、托盘、通知、IPC）
│   │   ├── server/
│   │   │   ├── index.ts        # Express + Socket.IO 初始化
│   │   │   ├── standalone.ts   # 独立 API 服务器（子进程运行）
│   │   │   └── routes/
│   │   │       ├── projects.ts # 项目 CRUD
│   │   │       ├── sessions.ts # Session 管理
│   │   │       ├── tasks.ts    # 任务状态更新（Agent 核心接口）
│   │   │       └── memories.ts # 记忆管理
│   │   ├── db/
│   │   │   ├── index.ts        # SQLite 封装
│   │   │   └── schema.ts       # 表结构定义
│   │   └── services/
│   │       ├── notification.ts # 系统通知
│   │       ├── memory.ts       # 记忆文件管理
│   │       └── recommendation.ts # 推荐算法
│   └── preload/
│       └── index.ts            # contextBridge API 暴露
├── src/                        # React 渲染进程
│   ├── App.tsx                 # 根组件
│   ├── main.tsx                # React 入口
│   ├── components/
│   │   ├── Sidebar/            # 左侧面板（头像/配置/API/帮助/设置）
│   │   ├── Toolbar/            # 顶部功能区（排序支持项目+卡片双维度）
│   │   ├── MessageBar/         # 消息色块区
│   │   ├── Board/              # 主看板（横向滚动列 + 放大模式分屏）
│   │   │   ├── index.tsx       # Board容器，支持常规多列/放大分屏两种模式
│   │   │   ├── ProjectColumn.tsx  # 项目列，macOS三色按钮+运行状态引导
│   │   │   └── ExpandedMemoryPanel.tsx  # 放大模式右半记忆面板
│   │   ├── SessionCard/        # Session 卡片（Portal右键菜单/动态高度）
│   │   ├── Modals/             # 弹窗系列（含 Settings 设置弹窗）
│   │   ├── Recommendation/     # 推荐任务
│   │   └── common/             # 通用组件（GlassCard/BlurOverlay/StatusBadge）
│   ├── stores/                 # Zustand 状态管理
│   │   ├── projectStore.ts     # 项目/Session/通知
│   │   ├── settingsStore.ts    # 用户设置 + DisplayConfig 显示配置
│   │   └── uiStore.ts          # UI 状态（弹窗/排序/过滤/卡片排序）
│   ├── hooks/
│   │   └── useSocket.ts        # Socket.IO 连接
│   └── styles/
│       └── globals.css         # Tailwind + 全局样式
├── cli/                        # CLI 命令行工具
├── skills/                     # Agent Skills 文件
│   ├── SKILL.md
│   └── references/*.md
├── docs/                       # 文档
├── .dashboard/                 # 看板配置和记忆
│   ├── project.yaml
│   └── memories/
└── test/                       # 测试脚本
```

## 架构特点

- **API 独立子进程**：Express API 服务器使用系统 Node.js 作为独立子进程运行，避免 Electron 内置 Node 的 native module ABI 不兼容问题
- **IPC 代理模式**：渲染进程通过 IPC → 主进程 → HTTP → API 子进程的方式访问数据
- **实时推送**：Socket.IO 从 API 子进程通过 stdout NOTIFY 协议传递到主进程，再通过 IPC 转发到渲染进程
