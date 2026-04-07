---
description: CodeBoard 看板对接规则 — 每次对话必须与看板同步状态
globs:
alwaysApply: true
---

# CodeBoard 看板对接（强制执行）

你正在一个已接入 CodeBoard 看板的项目中工作。**每次对话都必须按以下流程与看板同步。**

## 看板信息

- API 地址: `http://127.0.0.1:2585`
- 项目配置: `.dashboard/project.yaml`（读取 project_id）
- 详细 Skills: 仓库内 `skills/codeboard/SKILL.md`；全局安装则为 `~/.cursor/skills/codeboard/SKILL.md`（首次请完整阅读）

## 强制执行流程

### 对话开始后立即执行（在做任何事之前）

1. **读取** `.dashboard/project.yaml` 获取 `project_id`
2. **立即发送 session_start**（不要等规划完成）:
```bash
curl -s -X POST http://127.0.0.1:2585/api/tasks/update \
  -H "Content-Type: application/json" \
  -d '{"project_id":"<project_id>","session_id":"sess_<时间戳>","task_id":"task_<时间戳>","type":"session_start","goal":"<用户需求简述>","task_list":[]}'
```
3. 读取 `skills/codeboard/SKILL.md` 或 `~/.cursor/skills/codeboard/SKILL.md` 了解完整流程（如果尚未熟悉）

### 规划完成后

4. **再次** `POST /api/tasks/update`：`type` 仍为 `session_start`，**保持相同** `session_id`，请求体携带完整 `task_list`，将规划结果同步到看板（勿使用无效的 `type`）

### 每个任务执行时

5. 任务开始前: 发送 **task_start**
6. 任务完成后: 发送 **task_complete**

### 所有任务完成后

7. 发送 **session_complete**（summary 字段必填，写清完成了什么）
8. **强制记忆收录**: 检查 `.dashboard/memories/` 下 9 类记忆文件，不存在则创建，session-history.md 必须更新
9. **推送记忆** 到看板: `POST /api/memories/<project_id>/sync`

## API 快速参考

```
POST /api/tasks/update  — 核心接口，发送所有状态更新
  必填字段: project_id, session_id, task_id, type
  type 值: session_start | task_start | task_complete | session_complete

GET  /api/memories/<pid>/documents — 查看已有记忆
POST /api/memories/<pid>/sync     — 批量推送记忆
```

## 不可违反的规则

- ❌ 不可跳过 session_start（这会导致看板无法显示新卡片）
- ❌ 不可在规划完成后才发送 session_start（太晚了）
- ❌ 不可省略 task_start 或 task_complete
- ❌ 不可省略 session_complete 的 summary
- ❌ 不可跳过记忆收录步骤
