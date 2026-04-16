---
name: codeboard-openclaw
description: "OpenClaw hooks 接入方案。通过 hook handler 自动上报 Gateway 事件到 CodeBoard 看板。"
---

# CodeBoard — OpenClaw Hooks 接入方案

> OpenClaw 的 hooks 使用 `HOOK.md + handler.ts` 目录结构。
> 无 hooks 场景继续使用 `skills/codeboard/SKILL.md`（保留原全手动流程）。

## 核心原理

通过 OpenClaw 内部 hooks 系统，将 Gateway 事件自动上报到 CodeBoard 看板：

- `command:new` / `command:reset` → 自动触发 `session_start`（看板卡片出现）
- `command:stop` → 自动触发 `session_complete`（看板标记完成）
- 所有 13 种事件 → 全量记录到 `/api/hooks/events`

## 安装步骤

### 1. 复制 hook 目录

```bash
cp -r docs/hooks_templates/openclaw/codeboard-dashboard ~/.openclaw/hooks/
```

### 2. 启用 hook

```bash
openclaw hooks enable codeboard-dashboard
```

### 3. 验证安装

```bash
openclaw hooks check
openclaw hooks info codeboard-dashboard
```

确认状态为 `enabled` 且资格检查通过。

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

## Hooks 覆盖的全量事件（13 种）

| 事件 | 触发时机 |
|------|----------|
| `command:new` | 发出 /new 命令 |
| `command:reset` | 发出 /reset 命令 |
| `command:stop` | 发出 /stop 命令 |
| `command` | 任意命令（通用） |
| `session:compact:before` | 压缩开始前 |
| `session:compact:after` | 压缩完成后 |
| `session:patch` | 修改会话属性 |
| `agent:bootstrap` | 注入 bootstrap 文件前 |
| `gateway:startup` | Gateway 启动后 |
| `message:received` | 入站消息 |
| `message:transcribed` | 音频转写完成 |
| `message:preprocessed` | 媒体和链接理解完成 |
| `message:sent` | 出站消息已送达 |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CODEBOARD_API` | `http://127.0.0.1:2585` | CodeBoard API 地址 |

## 无 hooks 回退

若无法使用 hooks，继续启用 `skills/codeboard/SKILL.md`，按原全手动流程运行。
