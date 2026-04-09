---
name: codeboard-claudecode
description: Claude Code hooks-first integration for CodeBoard using ~/.claude/settings.json hooks. Keeps legacy codeboard skill for no-hooks fallback.
---

# CodeBoard Claude Code Hooks Skill

> 这是 Claude Code 的 **hooks 优先** 接入方案。  
> 无 hooks 时继续使用 `skills/codeboard/SKILL.md`。

## 使用场景

- 你使用 `claude` CLI 作为主 Agent
- 你希望通过 hooks 自动上报会话与工具事件

## 首次初始化（仅第一次）

1. 创建 `.dashboard/project.yaml`，确保存在 `project_id`。
2. 调用 `POST /api/projects/register` 完成项目注册。
3. 手动发送一次 `session_start`，确保看板出现首张卡片。
4. 后续由 hooks 自动上报。

## 安装要求（全局）

1. 将 `docs/hooks_templates/claudecode/settings.json` 合并到：
   - `~/.claude/settings.json`
2. 将 `docs/hooks_templates/claudecode/hooks/codeboard_claude_event.sh` 复制到：
   - `~/.claude/hooks/codeboard_claude_event.sh`
3. 添加执行权限：
   - `chmod +x ~/.claude/hooks/codeboard_claude_event.sh`
4. 可选环境变量：
   - `CODEBOARD_API`（默认 `http://127.0.0.1:2585`）

## 上报策略（Claude Code）

- `SessionStart`：自动尝试发送 `session_start`
- 全量 hooks 同步到 `POST /api/hooks/events`（保持工具调用独立轨迹）
- **不再**通过 ToolUse hooks 推导 `task_start/task_complete/session_complete`

## 仍需 Agent 手动执行（不可省略）

1. 规划完成后，手动用确认后的任务分解更新 `task_list`
2. 每个规划任务开始时，手动发 `task_start`
3. 每个规划任务完成时，手动发 `task_complete`
4. 最终人工复核后补发 `session_complete(summary)`
5. 记忆系统同步（更新 9 类文档 + `/api/memories/<project_id>/sync`）

## 覆盖的官方 hooks（全量）

- `PreToolUse`
- `PostToolUse`
- `Notification`
- `UserPromptSubmit`
- `Stop`
- `SubagentStop`
- `PreCompact`
- `SessionStart`
- `SessionEnd`

## 无 hooks 回退

无法启用 hooks 时，使用 `skills/codeboard/SKILL.md` 的纯 `curl` 流程，不影响稳定性。

