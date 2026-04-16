---
name: codeboard-claudecode
description: "Claude Code hooks-first 接入方案。通过 settings.json hooks 自动上报事件到 CodeBoard 看板。"
---

# CodeBoard — Claude Code Hooks 接入方案

> Claude Code 的 hooks 配置在 `~/.claude/settings.json` 中。
> 无 hooks 场景继续使用 `skills/codeboard/SKILL.md`（保留原全手动流程）。

## 核心原理

通过 Claude Code 官方 hooks 机制，将 Agent 事件自动上报到 CodeBoard 看板：

- `SessionStart` → 自动触发 `session_start`（看板卡片出现）
- `SessionEnd` → 自动触发 `session_complete`（看板标记完成）
- 所有工具调用（PreToolUse/PostToolUse）→ 全量记录到 `/api/hooks/events`

## 安装步骤（全局，只需做一次）

### 1. 安装 hook 脚本

```bash
mkdir -p ~/.claude/hooks
cp docs/hooks_templates/claudecode/hooks/codeboard_cc_event.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/codeboard_cc_event.sh
```

### 2. 配置 hooks

将以下内容合并到 `~/.claude/settings.json`（注意：如果已有 hooks 配置，需手动合并数组）：

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "*", "hooks": [{ "type": "command", "command": "~/.claude/hooks/codeboard_cc_event.sh" }] }
    ],
    "PostToolUse": [
      { "matcher": "*", "hooks": [{ "type": "command", "command": "~/.claude/hooks/codeboard_cc_event.sh" }] }
    ],
    "Notification": [
      { "hooks": [{ "type": "command", "command": "~/.claude/hooks/codeboard_cc_event.sh" }] }
    ],
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "~/.claude/hooks/codeboard_cc_event.sh" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "~/.claude/hooks/codeboard_cc_event.sh" }] }
    ],
    "SubagentStop": [
      { "hooks": [{ "type": "command", "command": "~/.claude/hooks/codeboard_cc_event.sh" }] }
    ],
    "PreCompact": [
      { "hooks": [{ "type": "command", "command": "~/.claude/hooks/codeboard_cc_event.sh" }] }
    ],
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "~/.claude/hooks/codeboard_cc_event.sh" }] }
    ],
    "SessionEnd": [
      { "hooks": [{ "type": "command", "command": "~/.claude/hooks/codeboard_cc_event.sh" }] }
    ]
  }
}
```

或直接复制模板：

```bash
cp docs/hooks_templates/claudecode/settings.json ~/.claude/settings.json
```

### 3. 验证安装

```bash
claude --debug
# 查看 hook 执行日志确认已加载
```

## 首次初始化（每个新项目做一次）

> hooks 无法替代"项目首次注册"。未完成初始化的项目，hooks 会静默跳过所有上报。

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

## Agent 仍需手动执行的操作

| 步骤 | 时机 | API |
|------|------|-----|
| 补发 task_list | 规划完成后 | `POST /api/tasks/update` type=session_start，带 task_list |
| task_start | 每个规划任务开始时 | `POST /api/tasks/update` type=task_start |
| task_complete | 每个规划任务完成时 | `POST /api/tasks/update` type=task_complete |
| session_complete | 所有任务完成后 | `POST /api/tasks/update` type=session_complete，带 summary |
| 记忆收录 | session 结束前 | 更新 `.dashboard/memories/` + `POST /api/memories/<pid>/sync` |

## Hooks 覆盖的事件

**工具操作**: PreToolUse, PostToolUse
**通知与提交**: Notification, UserPromptSubmit
**停止与压缩**: Stop, SubagentStop, PreCompact
**会话生命周期**: SessionStart, SessionEnd

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CODEBOARD_API` | `http://127.0.0.1:2585` | CodeBoard API 地址 |
| `CLAUDE_PROJECT_DIR` | 当前工作目录 | Claude Code 自动设置的项目目录 |

## 无 hooks 回退

若无法使用 hooks，继续启用 `skills/codeboard/SKILL.md`，按原全手动流程运行。
