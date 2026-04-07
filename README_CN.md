# CodeBoard - VibeCoding 多项目看板

CodeBoard 是一款专为 VibeCoding（AI 驱动编程）场景设计的 macOS 桌面应用，用于管理多个 AI Agent 项目的实时状态、任务进度、项目记忆。

## 核心功能

- **多项目看板** — 横向滚动的项目列视图，实时展示各项目 Session 和任务状态
- **任务追踪** — AI Agent 通过 API/CLI 上报任务进度，看板自动更新并推送系统通知
- **项目记忆** — 分类管理项目知识库（开发结构、技术方案、Bug 记录等），Agent 每次对话可读取和更新
- **多 Agent 支持** — 支持 Cursor Agent、Claude Code、OpenClaw 等主流 AI Agent 对接
- **Mac 原生体验** — 毛玻璃效果、系统托盘、系统通知，隐藏式标题栏

## 技术栈


| 层级     | 技术                                   |
| ------ | ------------------------------------ |
| 桌面框架   | Electron 33                          |
| 前端     | React 18 + TypeScript + Tailwind CSS |
| 状态管理   | Zustand                              |
| 动画     | Framer Motion                        |
| 后端 API | Express + better-sqlite3             |
| 构建工具   | electron-vite + Vite 6               |
| 包管理    | pnpm                                 |


## 快速开始

### 环境要求


| 依赖              | 版本                | 说明             |
| --------------- | ----------------- | -------------- |
| macOS           | >= 13.0 (Ventura) | 桌面应用运行环境       |
| Node.js         | >= 20.x           | 运行时（推荐 LTS 版本） |
| pnpm            | >= 9.x            | 包管理器           |
| Xcode CLI Tools | 最新                | native 模块编译    |
| Python          | 3.x               | node-gyp 依赖    |


### 从源码安装

```bash
# 1. 克隆仓库
git clone <repo-url> codeboard
cd codeboard

# 2. 安装 pnpm（如果尚未安装）
npm install -g pnpm

# 3. 安装项目依赖
pnpm install

# 4. 启动开发模式
pnpm dev
```

启动后会自动打开 CodeBoard 桌面应用，API 服务默认监听 `http://127.0.0.1:2585`。

### 构建与打包

```bash
# 构建生产版本
pnpm build

# 打包为 macOS .dmg 安装包
pnpm dist

cd codeboard && npx electron-builder --mac --arm64 2>&1

cd codeboard && npx electron-builder --mac --x64 2>&1
```

打包产物位于 `release/` 目录。

### 安装 CLI 工具

```bash
cd cli
pnpm install && pnpm build
npm install -g .

# 验证
codeboard --help
```

---

## 网络问题与镜像配置

在国内环境中，`pnpm install` 或打包时可能因网络问题导致依赖下载失败。以下是推荐的镜像配置：

### npm/pnpm 镜像

```bash
# 使用淘宝 npm 镜像
pnpm config set registry https://registry.npmmirror.com

# 或使用华为云镜像
pnpm config set registry https://mirrors.huaweicloud.com/repository/npm/
```

### Electron 下载镜像

打包时需要下载 Electron 二进制文件，建议配置镜像：

```bash
# 方式一：设置环境变量（推荐）
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"

# 方式二：写入 .npmrc 文件（永久生效）
cat >> .npmrc << 'EOF'
electron_mirror=https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
EOF

# 然后重新打包
pnpm dist
```

### 手动下载 Electron（备选方案）

如果镜像也不可用，可以手动下载 Electron 并放置到缓存目录：

```bash
# 1. 在浏览器中下载对应版本（以 v33.4.11 arm64 为例）
# https://npmmirror.com/mirrors/electron/33.4.11/electron-v33.4.11-darwin-arm64.zip

# 2. 放到 Electron 缓存目录
mkdir -p ~/Library/Caches/electron
cp electron-v33.4.11-darwin-arm64.zip ~/Library/Caches/electron/

# 3. 重新打包
pnpm dist
```

### node-gyp / better-sqlite3 编译问题

```bash
# 确保 Xcode CLI Tools 已安装
xcode-select --install

# 确保 Python 3 可用
python3 --version

# 如果 better-sqlite3 ABI 版本不匹配，手动重新编译
npx node-gyp rebuild \
  --directory=node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3
```

---

## 配置 AI Agent

CodeBoard 通过 Skill 文件指导 AI Agent 自动对接看板，支持多种 Agent：


| Agent        | 安装指南                                                             |
| ------------ | ---------------------------------------------------------------- |
| Cursor Agent | [docs/AGENT-SETUP-CURSOR.md](docs/AGENT-SETUP-CURSOR.md)         |
| Claude Code  | [docs/AGENT-SETUP-CLAUDECODE.md](docs/AGENT-SETUP-CLAUDECODE.md) |
| OpenClaw     | [docs/AGENT-SETUP-OPENCLEW.md](docs/AGENT-SETUP-OPENCLEW.md)     |


---

## 项目结构

```
codeboard/
├── electron/              # Electron 主进程 + 预加载脚本
│   ├── main/
│   │   ├── index.ts       # 主进程入口（窗口、托盘、IPC）
│   │   ├── server/        # API 服务器（独立子进程运行）
│   │   ├── db/            # 数据库 Schema
│   │   └── services/      # 业务服务（记忆、通知、推荐）
│   └── preload/
│       └── index.ts       # 上下文桥接（contextBridge）
├── src/                   # 渲染进程（React）
│   ├── App.tsx            # 根组件
│   ├── components/        # UI 组件（Board、Sidebar、Modals 等）
│   ├── stores/            # Zustand 状态管理
│   ├── hooks/             # 自定义 Hooks
│   ├── types/             # TypeScript 类型定义
│   └── styles/            # 全局 CSS
├── cli/                   # CodeBoard CLI 工具
├── skills/                # Agent Skills
│   ├── codeboard/         # 看板对接主 Skill（SKILL.md + references/）
│   └── install-codeboard-skills/  # Cursor 安装指引（链到 ~/.cursor/skills）
├── docs/                  # 文档
│   ├── API.md             # API 接口文档
│   ├── ARCHITECTURE.md    # 架构设计
│   ├── INSTALL.md         # 应用安装指南
│   └── AGENT-SETUP-*.md   # 各 Agent 安装指南
└── test/                  # 测试脚本
```

---

## 文档索引


| 文档                                                       | 说明                           |
| -------------------------------------------------------- | ---------------------------- |
| [docs/INSTALL.md](docs/INSTALL.md)                       | 应用安装与运行指南                    |
| [docs/API.md](docs/API.md)                               | REST API 接口文档                |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)             | 系统架构设计                       |
| [skills/codeboard/SKILL.md](skills/codeboard/SKILL.md)   | Agent 看板对接主 Skill            |
| [docs/AGENT-SETUP-CURSOR.md](docs/AGENT-SETUP-CURSOR.md) | Cursor Rules + Skills 安装（必读） |


## 开源协议

[Apache-2.0 license](https://github.com/show-board/codeboard#Apache-2.0-1-ov-file)