# CodeBoard 安装运行指导

## 环境要求

| 依赖 | 版本要求 | 说明 |
|------|----------|------|
| macOS | >= 13.0 (Ventura) | 桌面应用运行环境 |
| Node.js | >= 20.x | 运行时环境 |
| pnpm | >= 9.x | 包管理器 |
| Xcode CLI Tools | 最新 | Electron 构建依赖 |
| Python | 3.x | node-gyp 编译 native 模块需要 |

## 快速开始

### 1. 安装依赖

```bash
# 安装 pnpm（如果尚未安装）
npm install -g pnpm

# 克隆项目并进入目录
cd codeboard

# 安装项目依赖
pnpm install
```

### 2. 开发模式运行

```bash
# 启动 Electron + Vite 开发服务器
pnpm dev
```

启动后会自动打开 CodeBoard 桌面应用，API 服务默认监听 `http://127.0.0.1:2585`。

**稳定使用 Agent 的前提**：开发或日常使用期间请**保持 CodeBoard 进程运行**；关闭应用后 Cursor / CLI 将无法上报任务与记忆。

### 3. 安装 CLI 工具

```bash
# 进入 CLI 目录，编译并全局安装
cd cli
pnpm install
pnpm build
npm install -g .

# 验证安装
codeboard --help
codeboard --version
```

### 4. 配置 CLI 连接地址（可选）

若你在应用左侧面板修改了 Host/Port，需与 CLI 一致：

```bash
codeboard config --show
codeboard config --host 127.0.0.1 --port 2585
```

### 5. 构建生产版本

```bash
# 回到项目根目录
cd ..

# 构建应用
pnpm build

# 打包为 macOS .dmg 安装包
pnpm dist
```

打包完成后，安装包位于 `release/` 目录。

### 6. 安装 Hooks（推荐，自动上报）

CodeBoard 支持通过 Cursor / Claude Code / OpenClaw 的官方 hooks 机制**自动上报**全量 Agent 事件。安装 hooks 后，Agent 的 session 生命周期、工具调用、shell 命令等都会自动推送到看板，极大减少手动 curl 的操作。

#### Cursor Hooks

```bash
# 1. 复制 hooks 配置
cp docs/hooks_templates/cursor/hooks.json ~/.cursor/hooks.json

# 2. 复制 hook 脚本
mkdir -p ~/.cursor/hooks
cp docs/hooks_templates/cursor/hooks/codeboard_cursor_event.sh ~/.cursor/hooks/
chmod +x ~/.cursor/hooks/codeboard_cursor_event.sh

# 3. 验证: Cursor → 设置 → Hooks 选项卡 → 确认 21 种事件已加载
```

#### Claude Code Hooks

```bash
# 1. 复制 hook 脚本
mkdir -p ~/.claude/hooks
cp docs/hooks_templates/claudecode/hooks/codeboard_cc_event.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/codeboard_cc_event.sh

# 2. 将 hooks 配置合并到 settings.json
# 模板: docs/hooks_templates/claudecode/settings.json
# 如果已有 ~/.claude/settings.json，请手动合并 hooks 块

# 3. 验证: claude --debug → 查看 hook 执行日志
```

#### OpenClaw Hooks

```bash
# 1. 复制 hook 目录
cp -r docs/hooks_templates/openclaw/codeboard-dashboard ~/.openclaw/hooks/

# 2. 启用
openclaw hooks enable codeboard-dashboard

# 3. 验证: openclaw hooks check
```

> **session_id 统一机制**：hook 脚本在 sessionStart 时会将 `conversation_id` 写入 `.dashboard/.current_session` 文件。Agent 手动发 curl 时应优先读取此文件，确保 hooks 和手动上报合并到同一张看板卡片。

### 7. 配置 Agent（Skills + Rules）

安装 hooks 后仍需配置 Skills（用于项目初始化和任务规划上报）和 Rules：

| 场景 | 文档 | Hooks |
|------|------|-------|
| **Cursor**（推荐先看） | [AGENT-SETUP-CURSOR.md](AGENT-SETUP-CURSOR.md) | 21 种全量事件 |
| Claude Code | [AGENT-SETUP-CLAUDECODE.md](AGENT-SETUP-CLAUDECODE.md) | 9 种事件 |
| OpenClaw | [AGENT-SETUP-OPENCLEW.md](AGENT-SETUP-OPENCLEW.md) | 13 种事件 |

应用内 **魔法棒** 可生成完整目录包（rules + skills + hooks 配置文件），一键保存到本地。

### 8. 记忆同步注意事项

使用 CLI 同步本地 `.dashboard/memories/` 时，请在**业务项目根目录**执行（该目录下须有 `.dashboard/memories`）：

```bash
cd /你的项目根
codeboard memory sync <project_id>
```

在 `cli/` 子目录执行会因找不到 `.dashboard` 而同步失败。

## 运行测试

```bash
# 确保 CodeBoard 应用正在运行，然后执行 API 测试
bash test/api/test-all-apis.sh

# CLI 测试（需先全局安装 CLI）
bash test/cli/test-cli.sh
```

## 常见问题

### Q: 端口 2585 被占用怎么办？

在应用左侧面板修改端口号并重启，或通过 CLI：

```bash
codeboard config --port 3000
```

同时记得更新业务项目 `.cursor/rules/codeboard.md` 中的 API 地址与 Agent 配置。

### Q: better-sqlite3 编译失败？

确保已安装 Xcode CLI Tools 和 Python 3：

```bash
xcode-select --install
python3 --version
```

### Q: Electron 应用无法启动？

检查 Node.js 版本 >= 20，尝试重新安装依赖：

```bash
rm -rf node_modules
pnpm install
```

### Q: Agent 已配置但仍连不上看板？

1. 确认 CodeBoard 正在运行：`curl -s http://127.0.0.1:2585/api/health`（地址以左侧面板为准）  
2. 确认 Rules / Skill 中的 URL 与上一步一致  
3. 确认 `project_id` 已在看板注册
