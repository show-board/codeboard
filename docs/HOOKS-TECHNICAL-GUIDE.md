# CodeBoard Hooks 技术文档（Cursor / Claude Code / OpenClaw）

> 本文说明三类 Agent 在 hooks 模式下，如何与 CodeBoard 交互、发送哪些信息、哪些场景仍需 Agent 手动补发。

## 1. 统一目标

CodeBoard 侧核心状态分两类：

1. 任务看板状态（`/api/tasks/update`）
   - `session_start`
   - `task_start`
   - `task_complete`
   - `session_complete`
2. hooks 轨迹审计（`/api/hooks/events` + `/api/hooks/sessions/:sessionId`）

三类 Agent hooks 都统一走这两条链路。

---

## 2. 必须先明确的边界

即使启用 hooks，以下动作仍建议由 Agent 手动确认执行：

1. **首次初始化项目**
   - 创建 `.dashboard/project.yaml`
   - 调用 `/api/projects/register`
2. **规划完成后的最终任务清单**
   - task 以“规划任务”为准，不由 hooks 自动生成
   - Agent 必须手动发送 `session_start(task_list)`
3. **任务生命周期**
   - 每个规划任务都要手动发送 `task_start` 与 `task_complete`
   - 最终手动发送 `session_complete(summary)`
4. **记忆同步**
   - hooks 不直接改写 `.dashboard/memories/` 文档
   - 仍需 Agent 更新记忆并调用 `/api/memories/<project_id>/sync`

---

## 3. 覆盖矩阵（是否被 hooks 覆盖）

| 需求 | Cursor hooks | Claude hooks | OpenClaw hooks | 备注 |
|------|--------------|--------------|----------------|------|
| 首次 `session_start` | 是 | 是 | 是 | 自动触发 |
| `task_list` 初始更新 | 否（手动） | 否（手动） | 否（手动） | 按规划语义由 Agent 发送 |
| `task_start` | 否（手动） | 否（手动） | 否（手动） | task 不等于 tool call |
| `task_complete` | 否（手动） | 否（手动） | 否（手动） | task 不等于 tool call |
| `session_complete` | 否（手动） | 否（手动） | 否（手动） | 由 Agent 复核总结后发送 |
| hooks 明细轨迹 | 是 | 是 | 是 | 全量写入 `/api/hooks/events` |
| 记忆同步 | 否 | 否 | 否 | 需 Agent 手动执行 |

### 3.1 重要说明：官方没有“task hooks”，且我们已取消映射

你说得对，官方 hooks 没有 `task_start/task_complete`。  
当前实现中，hooks **不再**推导 task；task 完全由 Agent 根据“规划任务语义”手动上报。

### 3.2 那么 task 完成时间如何判定

- 由 Agent 手动调用 `task_complete` 的时间决定（服务端记录 `created_at`）
- 这个时间点是“规划任务完成”的语义时间，而非工具调用结束时间

### 3.3 总结信息如何获取

- `task_complete.task_summary`：由 Agent 基于任务结果手写总结
- `session_complete.summary`：由 Agent 在收尾阶段给出整段 Session 总结
- hooks 只负责工具/MCP/文件等轨迹审计，不负责生成 task 总结

---

## 4. Cursor 交互细节

### 4.1 事件到 API 映射

- `sessionStart` -> `POST /api/tasks/update(type=session_start)`
- 所有 hooks -> `POST /api/hooks/events`

### 4.2 示例

1) 会话启动自动创建卡片：

```json
{
  "project_id": "proj_xxx",
  "session_id": "sess_xxx",
  "task_id": "task_session_start_sess_xxx",
  "type": "session_start",
  "goal": "hooks 自动触发 session_start",
  "task_list": []
}
```

2) 工具调用只进入 hooks 轨迹，不改变 task 状态：
- `preToolUse/postToolUse/...` -> `/api/hooks/events`

---

## 5. Claude Code 交互细节

### 5.1 事件到 API 映射

- `SessionStart` -> `session_start`
- 全量 hooks -> `/api/hooks/events`

### 5.2 示例

`SessionStart` 触发时，自动发送 session_start：

```json
{
  "type": "session_start",
  "goal": "hooks 自动触发 session_start",
  "task_list": []
}
```

---

## 6. OpenClaw 交互细节

### 6.1 事件到 API 映射

- `command:new` / `command:reset` -> `session_start`
- 全量 hooks -> `/api/hooks/events`

### 6.2 示例

当 `command:new` 触发：

```json
{
  "type": "session_start",
  "goal": "hooks 自动触发 session_start",
  "task_list": []
}
```

---

## 7. Agent 仍需手动补发的命令（防遗漏）

以下命令建议保留在 skills 指南中，并要求 Agent 在关键节点主动执行：

1. 规划后确认任务清单（覆盖粗拆误差）：

```bash
curl -s -X POST http://127.0.0.1:2585/api/tasks/update \
  -H "Content-Type: application/json" \
  -d '{"project_id":"<project_id>","session_id":"<session_id>","task_id":"task_<ts>","type":"session_start","goal":"<goal>","task_list":[{"name":"任务A","status":"queued"}]}'
```

2. 每个规划任务开始时：

```bash
curl -s -X POST http://127.0.0.1:2585/api/tasks/update \
  -H "Content-Type: application/json" \
  -d '{"project_id":"<project_id>","session_id":"<session_id>","task_id":"task_<ts>","type":"task_start","task_name":"<任务名>","task_plan":"<任务计划>"}'
```

3. 每个规划任务完成时：

```bash
curl -s -X POST http://127.0.0.1:2585/api/tasks/update \
  -H "Content-Type: application/json" \
  -d '{"project_id":"<project_id>","session_id":"<session_id>","task_id":"task_<same_id>","type":"task_complete","task_name":"<任务名>","task_summary":"<任务总结>"}'
```

4. 最终人工总结：

```bash
curl -s -X POST http://127.0.0.1:2585/api/tasks/update \
  -H "Content-Type: application/json" \
  -d '{"project_id":"<project_id>","session_id":"<session_id>","task_id":"task_<ts>","type":"session_complete","summary":"<人工确认总结>"}'
```

5. 记忆同步：

```bash
curl -s -X POST http://127.0.0.1:2585/api/memories/<project_id>/sync \
  -H "Content-Type: application/json" \
  -d '{"files":[...]}'
```

---

## 8. 一键安装脚本

仓库提供三套脚本：

- `scripts/install-hooks-cursor.sh`
- `scripts/install-hooks-claudecode.sh`
- `scripts/install-hooks-openclaw.sh`
- `scripts/install-hooks-all.sh`（总控脚本，自动检测环境并安装对应 Agent）

示例：

```bash
cd <repo>
./scripts/install-hooks-all.sh
# 或强制安装全部模板
./scripts/install-hooks-all.sh --all
```

---

## 9. 故障排查建议

1. hooks 事件有但看板任务没更新：
   - 检查 `CODEBOARD_API` 指向
   - 检查 `/api/tasks/update` 是否可达
2. task 状态与真实进度不一致：
   - 检查 Agent 是否按第 7 节逐条发送 `task_start/task_complete`
3. 全屏右侧无数据：
   - 先确认 hooks 是否写入 `/api/hooks/events`
   - 再检查 `session_id` 是否一致

