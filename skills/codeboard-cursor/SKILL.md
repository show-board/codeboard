---
name: codeboard-cursor
description: Cursor hooks-first integration for CodeBoard. Use global ~/.cursor/hooks.json and keep legacy codeboard skill as fallback when hooks are unavailable.
---

# CodeBoard Cursor Hooks Skill

> 这是 Cursor 的 **hooks 优先** 接入方案。  
> 无 hooks 场景继续使用 `skills/codeboard/SKILL.md`（保留原流程，不冲突）。

## 目标

- 通过 Cursor 官方 hooks 机制，自动把关键事件上报到 CodeBoard
- 减少每轮对话手写 `curl` 的不稳定因素
- 保留首次初始化的手动兜底流程

## 何时使用本 Skill

- 你正在使用 Cursor Agent（Cmd+K / Agent Chat / Tab）
- 你希望把 hooks 触发记录同步到 CodeBoard 看板

## 首次初始化（仅第一次）

> hooks 无法替代“项目首次注册”这一步。

1. 在项目根创建 `.dashboard/project.yaml`（包含 `project_id`）。
2. 调用 `POST /api/projects/register` 注册项目。
3. 手动发送一次 `session_start`（保证第一张卡片出现）。
4. 之后交由 hooks 自动上报。

## 安装要求（全局）

1. 将仓库模板 `docs/hooks_templates/cursor/hooks.json` 复制到：
   - `~/.cursor/hooks.json`
2. 将模板脚本目录 `docs/hooks_templates/cursor/hooks/` 复制到：
   - `~/.cursor/hooks/`
3. 给脚本执行权限：
   - `chmod +x ~/.cursor/hooks/codeboard_cursor_event.sh`
4. 可选环境变量（未设置时用默认值）：
   - `CODEBOARD_API`（默认 `http://127.0.0.1:2585`）

## 上报策略（Cursor）

- `sessionStart`：自动触发 `session_start`（仅当读取到项目 `project_id`）
- 全量 hooks 都会同步到 `POST /api/hooks/events`（保持工具调用独立轨迹）
- **不再**通过 ToolUse hooks 推导 `task_start/task_complete/session_complete`

## 仍需 Agent 手动执行（不可省略）

> `task` 代表 Session 规划任务，不等于工具调用，以下必须由 Agent 按语义手动上报：

1. **规划完成后**：手动再发一次 `session_start`，带“人工确认后的完整 `task_list`”
2. **每个规划任务开始时**：手动发 `task_start`
3. **每个规划任务完成时**：手动发 `task_complete`
4. **所有规划任务完成后**：手动发 `session_complete(summary)`
5. **记忆收录**：更新 `.dashboard/memories/` 9 类文档并调用 `/api/memories/<project_id>/sync`

## 覆盖的官方 hooks（全量）

- Agent 生命周期：`sessionStart` `sessionEnd` `stop` `preCompact`
- 通用工具：`preToolUse` `postToolUse` `postToolUseFailure`
- 子代理：`subagentStart` `subagentStop`
- Shell/MCP：`beforeShellExecution` `afterShellExecution` `beforeMCPExecution` `afterMCPExecution`
- 文件与提交：`beforeReadFile` `afterFileEdit` `beforeSubmitPrompt`
- 输出观察：`afterAgentResponse` `afterAgentThought`
- Tab：`beforeTabFileRead` `afterTabFileEdit`

## 无 hooks 回退（必须保留）

若你无法使用 hooks（例如受限环境）：

- 继续启用 `skills/codeboard/SKILL.md`
- 按原流程手动执行：
  - 对话开始先 `session_start`
  - 每任务 `task_start -> task_complete`
  - 收尾 `session_complete + memories sync`

