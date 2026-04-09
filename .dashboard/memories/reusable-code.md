# 可复用的类及函数列表

## 通用组件

### GlassCard (`src/components/common/GlassCard.tsx`)
毛玻璃圆角卡片容器。支持普通模式和弹窗模式（更强模糊和阴影）。

```typescript
<GlassCard modal className="...">内容</GlassCard>
```

### BlurOverlay (`src/components/common/BlurOverlay.tsx`)
虚化背景遮罩，弹窗打开时使用。

```typescript
<BlurOverlay onClick={onClose} />
```

### StatusBadge (`src/components/common/StatusBadge.tsx`)
任务状态徽章，根据状态显示对应颜色和文字。

## 状态管理 Stores

### useProjectStore (`src/stores/projectStore.ts`)
- `loadProjects()` — 加载所有项目
- `loadSessions(projectId)` — 加载指定项目的 Sessions
- `loadTaskUpdates(sessionId)` — 加载任务更新记录
- `handleTaskUpdate(data)` — 处理实时推送的任务更新
- `hideProject / trashProject / restoreProject` — 项目状态管理

### useSettingsStore (`src/stores/settingsStore.ts`)
- `loadSettings()` — 从数据库加载设置 + 头像
- `updateNickname / updateMotto / updateAvatar` — 更新用户信息
- `restartServer(host, port)` — 重启 API 服务器
- `displayConfig` — 显示配置（cardHeightMode / showRunningGuide / showServerConfig / showApiDetail）
- `updateDisplayConfig(partial)` — 局部更新显示配置，持久化到 localStorage

### useUIStore (`src/stores/uiStore.ts`)
- `showXxx / setShowXxx` — 控制各种弹窗的显示状态（含 showSettings）
- `sortType / sortOrder` — 项目排序方式 + 正序/倒序
- `cardSortOrder` — 卡片排序（newest/oldest）
- `timeFilter` — 时间过滤
- `scrollToProject` — 消息色块点击后自动滚动

## Electron IPC API (`electron/preload/index.ts`)
所有渲染进程可调用的 IPC 方法通过 `window.codeboard` 暴露：
- `getProjects / getSessions / getTaskUpdates` — 数据读取
- `selectAvatar / saveAvatar / getAvatar` — 头像管理
- `saveSkillsFile(content)` — Skills 文件保存
- `restartServer(host, port)` — 服务器重启
- `onTaskUpdate / onProjectUpdate / onNotification` — 实时事件监听

## 后端工具函数

### safeApiGet (`electron/main/index.ts`)
安全调用 API，失败时返回默认值而非抛出异常：

```typescript
async function safeApiGet<T>(path: string, fallback: T): Promise<T>
```

### startServerProcess (`electron/main/index.ts`)
启动 API 服务器子进程，监听 stdout 确认就绪：

```typescript
function startServerProcess(host: string, port: number): Promise<void>
```

### generateSkillsTemplate (`electron/main/server/skillsTemplate.ts`)
根据 baseUrl 生成单文件 Skills Markdown（YAML frontmatter + 流程与 curl 示例）；由 `index.ts` 的 `GET /api/skills/generate` 调用。

## Hooks 统计相关（2026-04-10）

### ExpandedHooksPanel (`src/components/Board/ExpandedHooksPanel.tsx`)
全屏模式右侧 hooks 统计面板组件：
- 读取 `/api/hooks/sessions/:sessionId`
- 展示“概览卡 + 全分类胶囊 + 高频 Hook 标签 + 明细列表”
- 支持按 category/hook_name 双维度筛选
- 明细项支持结构化标签与 payload JSON 折叠查看

### addHookEvent / getHookStatsBySession (`electron/main/db/index.ts`)
- `addHookEvent(data)`：落库单条 hooks 事件，自动分类与摘要
- `getHookStatsBySession(sessionId)`：返回会话级聚合统计（含分类计数）
- `getHookEventsBySession(sessionId, limit)`：返回按时间倒序的 hooks 明细

## hooks 安装与桥接脚本（2026-04-10）

### install-hooks-cursor.sh / install-hooks-claudecode.sh / install-hooks-openclaw.sh（`scripts/`）
- 一键安装 hooks 模板与脚本
- 自动备份旧配置（Cursor/Claude）
- 降低新机器初始化成本

### install-hooks-all.sh（`scripts/install-hooks-all.sh`）
- 总控安装入口：自动检测 Cursor / Claude Code / OpenClaw
- 只安装检测到的 Agent（`--all` 可强制安装全部）
- 对未检测到的 Agent 给出差异化提示（skip + next step）

### codeboard_cursor_event.sh / codeboard_claude_event.sh（`docs/hooks_templates/*/hooks/`）
- 将 hooks 事件同时转发到：
  - `/api/tasks/update`（仅 session_start）
  - `/api/hooks/events`（轨迹审计）
- 不再根据 ToolUse 自动推导 task 状态，task 由 skills 指导 Agent 手动发送
