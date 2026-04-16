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

### Step 0: 项目初始化确认（对话开始前最先执行）

> 在执行任何操作之前，**必须先确认项目已完成 CodeBoard 初始化**。

1. **运行初始化检测脚本**（优先使用）:
```bash
python3 ~/.cursor/skills/codeboard/scripts/init_project_judge.py
```
如果脚本不存在，则手动检查 `.dashboard/project.yaml` 是否存在且包含 `project_id` 和 `project_name`。

2. **根据检测结果决定下一步**:
   - `STATUS: INITIALIZED` → 项目已就绪，继续后续流程
   - `STATUS: NOT_INITIALIZED` 或 `INCOMPLETE_CONFIG` → 按脚本提示完成初始化（创建 project.yaml、注册项目）
   - `STATUS: API_UNREACHABLE` → CodeBoard 未运行，提醒用户启动后再继续
   - `STATUS: NOT_REGISTERED` → 项目配置存在但未注册，执行 `POST /api/projects/register`

3. **初始化完成后方可继续后续步骤**

### 对话开始后立即执行

1. **读取** `.dashboard/project.yaml` 获取 `project_id`
2. **获取 Cursor 对话映射 ID**（★ 关键步骤 ★ — 用于 hooks 精确关联）:
   - 读取 `.dashboard/.current_session` 获取 `conversation_id`（整个对话窗口的 ID）
   - 读取 `.dashboard/.current_generation` 获取 `generation_id`（当前轮次的 ID）
   - 两个 ID 由 Cursor Hooks 自动写入，组合后精确关联本轮对话的 hook 事件
```bash
CONV_ID=$(cat .dashboard/.current_session 2>/dev/null || echo "")
GEN_ID=$(cat .dashboard/.current_generation 2>/dev/null || echo "")
```
3. **立即发送 session_start**（不要等规划完成，带上映射 ID）:
```bash
curl -s -X POST http://127.0.0.1:2585/api/tasks/update \
  -H "Content-Type: application/json" \
  -d '{"project_id":"<project_id>","session_id":"sess_<时间戳>","task_id":"task_<时间戳>","type":"session_start","goal":"<用户需求简述>","task_list":[],"conversation_id":"'"$CONV_ID"'","generation_id":"'"$GEN_ID"'"}'
```
4. 读取 `skills/codeboard/SKILL.md` 或 `~/.cursor/skills/codeboard/SKILL.md` 了解完整流程（如果尚未熟悉）

### 规划完成后

5. **再次** `POST /api/tasks/update`：`type` 仍为 `session_start`，**保持相同** `session_id`，请求体携带完整 `task_list`，将规划结果同步到看板（勿使用无效的 `type`）

### 每个任务执行时

6. 任务开始前: 发送 **task_start**
7. 任务完成后: 发送 **task_complete**

### 所有任务完成后

8. 发送 **session_complete**（summary 字段必填，写清完成了什么）
9. **强制记忆收录**: 检查 `.dashboard/memories/` 下 9 类记忆文件，不存在则创建，session-history.md 必须更新
10. **推送记忆** 到看板: `POST /api/memories/<project_id>/sync`

## API 快速参考

```
POST /api/tasks/update  — 核心接口，发送所有状态更新
  必填字段: project_id, session_id, task_id, type
  type 值: session_start | task_start | task_complete | session_complete

GET  /api/memories/<pid>/documents — 查看已有记忆
POST /api/memories/<pid>/sync     — 批量推送记忆
```

## 不可违反的规则

- ❌ 不可跳过初始化确认（未初始化的项目无法与看板交互）
- ❌ 不可跳过 session_start（这会导致看板无法显示新卡片）
- ❌ 不可在规划完成后才发送 session_start（太晚了）
- ❌ 不可在 session_start 中遗漏 conversation_id 和 generation_id（会导致 hooks 无法精确关联到卡片）
- ❌ 不可省略 task_start 或 task_complete
- ❌ 不可省略 session_complete 的 summary
- ❌ 不可跳过记忆收录步骤
