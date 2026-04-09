---
name: codeboard-openclaw
description: OpenClaw hooks-first integration for CodeBoard using ~/.openclaw/hooks custom hook package. Keeps legacy codeboard skill for no-hooks fallback.
---

# CodeBoard OpenClaw Hooks Skill

> 这是 OpenClaw 的 **hooks 优先** 接入方案。  
> 无 hooks 场景依旧可回退到 `skills/codeboard/SKILL.md`。

## 使用场景

- 你通过 OpenClaw Gateway 运行 Agent
- 你希望将 hooks 事件持续同步到 CodeBoard 看板

## 首次初始化（仅第一次）

1. 在项目根创建 `.dashboard/project.yaml`（必须包含 `project_id`）。
2. 注册项目：`POST /api/projects/register`。
3. 手动发送一次 `session_start`。
4. 之后交由 hooks 自动上报事件。

## 安装要求（全局）

1. 将目录 `docs/hooks_templates/openclaw/codeboard-dashboard/` 复制到：
   - `~/.openclaw/hooks/codeboard-dashboard/`
2. 启用 hook：
   - `openclaw hooks enable codeboard-dashboard`
3. 检查状态：
   - `openclaw hooks check`
4. 可选环境变量：
   - `CODEBOARD_API`（默认 `http://127.0.0.1:2585`）

## 上报策略（OpenClaw）

- 在 `command:new` / `command:reset` 时自动尝试发送 `session_start`
- 其余事件统一发送到 `POST /api/hooks/events`
- 事件原始上下文会作为 `payload` 一并存储，便于全屏会话追踪
- **不再**通过 message hooks 推导 `task_start/task_complete/session_complete`

## 建议监听事件

- 命令：`command:new` `command:reset` `command:stop` `command`
- 会话：`session:compact:before` `session:compact:after` `session:patch`
- 生命周期：`gateway:startup` `agent:bootstrap`
- 消息：`message:received` `message:transcribed` `message:preprocessed` `message:sent`

## 无 hooks 回退

若 OpenClaw 环境不允许安装 hooks，请继续使用 `skills/codeboard/SKILL.md` 的手动流程。

## 仍需 Agent 手动执行（不可省略）

1. 规划完成后用人工确认后的任务拆解更新 `task_list`
2. 每个规划任务开始时手动发 `task_start`
3. 每个规划任务完成时手动发 `task_complete`
4. 人工复核最终总结并补发 `session_complete(summary)`
5. 记忆收录与同步（9 类文档 + `/api/memories/<project_id>/sync`）

