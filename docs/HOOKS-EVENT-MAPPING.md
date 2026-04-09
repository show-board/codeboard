# CodeBoard Hooks 事件映射

> 目标：把 Cursor / Claude Code / OpenClaw 的 hooks 事件统一上报到 CodeBoard，形成可统计的 session 轨迹。
>
> 完整流程与安装示例见：`docs/HOOKS-TECHNICAL-GUIDE.md`

## 统一上报接口

- `POST /api/hooks/events`
- 请求体最小字段：
  - `project_id`
  - `session_id`
  - `agent_type`（`cursor` / `claudecode` / `openclaw`）
  - `hook_event_name`
  - `status`（`success` / `error`）
  - `payload`（原始 hook 输入 JSON）

> 说明：hooks 轨迹接口只用于工具/会话行为审计。  
> `task_start/task_complete/session_complete` 由 Agent 按 skills 语义手动调用 `/api/tasks/update`。

## 分类规则（看板统计用）

| 分类 | 触发判定（示例） | 统计含义 |
|------|------------------|----------|
| `mcp` | 事件名包含 `mcp`，或工具名命中 `mcp__*` | MCP 调用次数 |
| `tool_call` | `preToolUse/postToolUse`、`PreToolUse/PostToolUse` | ToolCall 次数 |
| `file_write` | 事件名包含 `afterFileEdit`、`Write/Edit/MultiEdit` | 文件写入次数 |
| `file_read` | 事件名包含 `beforeReadFile`、`Read` | 文件读取次数 |
| `shell` | 事件名包含 `Shell`、工具名为 `Bash/Shell` | Shell 调用次数 |
| `session` | `sessionStart/sessionEnd/SessionStart/SessionEnd` | 会话生命周期 |
| `compact` | `preCompact/PreCompact/session:compact:*` | 上下文压缩行为 |
| `message` | `message:*`、`Notification` | 消息流事件 |
| `subagent` | `subagent*`、`SubagentStop` | 子代理行为 |

## Cursor 全量 hooks

`sessionStart` `sessionEnd` `preToolUse` `postToolUse` `postToolUseFailure` `subagentStart` `subagentStop` `beforeShellExecution` `afterShellExecution` `beforeMCPExecution` `afterMCPExecution` `beforeReadFile` `afterFileEdit` `beforeSubmitPrompt` `preCompact` `stop` `afterAgentResponse` `afterAgentThought` `beforeTabFileRead` `afterTabFileEdit`

## Claude Code hooks

`PreToolUse` `PostToolUse` `Notification` `UserPromptSubmit` `Stop` `SubagentStop` `PreCompact` `SessionStart` `SessionEnd`

## OpenClaw hooks（建议）

`command:new` `command:reset` `command:stop` `command` `session:compact:before` `session:compact:after` `session:patch` `agent:bootstrap` `gateway:startup` `message:received` `message:transcribed` `message:preprocessed` `message:sent`

