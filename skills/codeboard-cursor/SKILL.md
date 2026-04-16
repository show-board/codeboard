---
name: codeboard-cursor
description: "Cursor hooks-first 接入方案。通过全局 hooks.json 自动上报全量事件到 CodeBoard 看板，仅首次初始化和任务规划需手动操作。"
---

# CodeBoard — Cursor Hooks 接入方案

> 这是 Cursor 的 **hooks 优先** 接入方案。
> 无 hooks 场景继续使用 `skills/codeboard/SKILL.md`（保留原全手动流程，不冲突）。

## 核心原理

通过 Cursor 官方 hooks 机制，将 **21 种** Agent 生命周期事件自动上报到 CodeBoard 看板：

- `sessionStart` → 自动触发 `session_start`（看板卡片出现）
- `sessionEnd` → 自动触发 `session_complete`（看板标记完成）
- 所有工具调用、文件操作、shell 命令等 → 全量记录到 `/api/hooks/events`

## 安装步骤（全局，只需做一次）

### 1. 安装 hooks.json

```bash
# 从 CodeBoard 仓库复制模板
cp docs/hooks_templates/cursor/hooks.json ~/.cursor/hooks.json
```

或手动创建 `~/.cursor/hooks.json`，内容包含全量 hook 事件映射。

### 2. 安装 hook 脚本

```bash
mkdir -p ~/.cursor/hooks
cp docs/hooks_templates/cursor/hooks/codeboard_cursor_event.sh ~/.cursor/hooks/
chmod +x ~/.cursor/hooks/codeboard_cursor_event.sh
```

### 3. 验证安装

打开 Cursor → 设置 → Hooks 选项卡 → 确认所有 hooks 已加载。

## 首次初始化（每个新项目做一次）

> hooks 无法替代"项目首次注册"。未完成初始化的项目，hooks 会静默跳过所有上报。

### 自动检测

```bash
python3 ~/.cursor/skills/codeboard/scripts/init_project_judge.py
# 或项目内: python3 skills/codeboard/scripts/init_project_judge.py
```

### 手动初始化

1. **创建项目配置**:

```bash
mkdir -p .dashboard/memories
```

创建 `.dashboard/project.yaml`:

```yaml
project_name: "你的项目名称"
project_description: "项目简要描述"
project_id: "proj_<当前时间戳>"
created_at: "<ISO 时间>"
```

2. **注册项目**:

```bash
curl -s -X POST http://127.0.0.1:2585/api/projects/register \
  -H "Content-Type: application/json" \
  -d '{"project_id":"<project_id>","name":"项目名称","description":"项目描述"}'
```

3. **验证**: `curl -s -X POST http://127.0.0.1:2585/api/projects/<project_id>/test` → 返回 `{"available": true}`

4. 首次手动发送一次 `session_start`（保证第一张卡片出现），之后由 hooks 自动触发。

## Agent 仍需手动执行的操作

> hooks 自动处理了 session 生命周期和事件轨迹，但以下 **规划级任务** 仍需 Agent 手动上报：

| 步骤 | 时机 | API |
|------|------|-----|
| 补发 task_list | 规划完成后 | `POST /api/tasks/update` type=session_start，带 task_list |
| task_start | 每个规划任务开始时 | `POST /api/tasks/update` type=task_start |
| task_complete | 每个规划任务完成时 | `POST /api/tasks/update` type=task_complete |
| session_complete | 所有任务完成后 | `POST /api/tasks/update` type=session_complete，带 summary |
| 记忆收录 | session 结束前 | 更新 `.dashboard/memories/` + `POST /api/memories/<pid>/sync` |

## Hooks 覆盖的全量事件（21 种）

**Agent 生命周期**: sessionStart, sessionEnd, stop, preCompact
**通用工具**: preToolUse, postToolUse, postToolUseFailure
**子代理**: subagentStart, subagentStop
**Shell/MCP**: beforeShellExecution, afterShellExecution, beforeMCPExecution, afterMCPExecution
**文件操作**: beforeReadFile, afterFileEdit
**提交审查**: beforeSubmitPrompt
**输出观察**: afterAgentResponse, afterAgentThought
**Tab 补全**: beforeTabFileRead, afterTabFileEdit

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CODEBOARD_API` | `http://127.0.0.1:2585` | CodeBoard API 地址 |

## 无 hooks 回退

若无法使用 hooks（受限环境），继续启用 `skills/codeboard/SKILL.md`，按原全手动流程运行。
