# 任务规划与上报

## ★ Step 2: 立即发送 session_start（最高优先级）

**确认项目注册后，在执行任何其他操作之前，必须立即发送 session_start。**
此时 goal 可以先用用户消息的简要概述，task_list 可以为空，后续再更新。

```bash
curl -X POST http://127.0.0.1:2585/api/tasks/update \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "<project_id>",
    "session_id": "sess_<当前时间戳>",
    "task_id": "task_<当前时间戳>",
    "type": "session_start",
    "goal": "用户需求的简要概述（从用户消息中提取）",
    "task_list": []
  }'
```

> **为什么要先发送？** 看板需要立即收到 session_start 才能创建新的 Session 卡片。如果先做规划和读取记忆，看板会长时间停留在上一个 Session 的完成状态。

---

## Step 4: 分析需求，规划任务列表

读取记忆后，分析用户需求，拆分为可执行的任务列表。

## Step 5: 发送任务列表更新

规划完成后，**立即将任务列表更新到看板**：

```bash
curl -X POST http://127.0.0.1:2585/api/tasks/update \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "<project_id>",
    "session_id": "<session_id>",
    "task_id": "task_<时间戳>",
    "type": "task_start",
    "task_name": "第一个任务名称",
    "task_plan": "执行计划",
    "task_list": [
      {"name": "任务1", "status": "running"},
      {"name": "任务2", "status": "queued"},
      {"name": "任务3", "status": "queued"}
    ]
  }'
```

---

## Step 6-8: 任务执行循环

### 每个任务开始前发送 task_start

```bash
curl -X POST http://127.0.0.1:2585/api/tasks/update \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "<project_id>",
    "session_id": "<session_id>",
    "task_id": "task_<时间戳>",
    "type": "task_start",
    "task_name": "当前任务名称",
    "task_plan": "任务执行计划",
    "task_list": [
      {"name": "任务1", "status": "completed"},
      {"name": "任务2", "status": "running"},
      {"name": "任务3", "status": "queued"}
    ]
  }'
```

### 每个任务完成后发送 task_complete

```bash
curl -X POST http://127.0.0.1:2585/api/tasks/update \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "<project_id>",
    "session_id": "<session_id>",
    "task_id": "task_<时间戳>",
    "type": "task_complete",
    "task_name": "已完成的任务名称",
    "task_summary": "任务完成总结",
    "task_list": [
      {"name": "任务1", "status": "completed"},
      {"name": "任务2", "status": "completed"},
      {"name": "任务3", "status": "queued"}
    ]
  }'
```

重复 Step 6-8 直到所有任务完成。**每个任务的 task_start 和 task_complete 都必须发送，不可跳过。**
