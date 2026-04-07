# 执行流程总结与注意事项

## 执行流程（严格按序）

```
Step 1: 检查 .dashboard/project.yaml → 确认项目注册
Step 2: ★ 立即发送 session_start → 看板出现新卡片（最高优先级）
Step 3: 读取记忆（必读 vibe-config）
Step 4: 分析需求，规划任务列表
Step 5: 发送任务列表更新到看板
Step 6-8: 循环: task_start → 执行 → task_complete
Step 9: 发送 session_complete（必含详细 summary）
Step 10: 【强制】记忆收录
Step 11: 推送记忆到看板
```

## ⚠️ 强制规则

### session_start 必须第一时间发送
- 确认项目后，**在读取记忆和规划之前**立即发送 session_start
- goal 字段先用用户消息概述，task_list 可先为空
- 这确保看板立即显示新 Session 卡片

### 每个 API 调用都不可省略
- session_start：对话开始后立即发送
- task_start：每个任务开始前发送
- task_complete：每个任务完成后发送
- session_complete：所有任务完成后发送（summary 必填）

### session_complete 总结要求
`summary` 字段**必填**，内容必须包含：
1. 完成了哪些任务（列表形式）
2. 关键变更点
3. 注意事项或遗留问题

此内容直接显示在看板 Session 卡片底部。

### 记忆收录强制规则
- **基础记忆（1-6）**：首次运行时全部创建，后续按需更新
- **运行记忆（7-9）**：按本次运行情况选择性更新
- **session-history.md**：每次必须追加记录
- **vibe-config.md**：每次必须读取
- 记忆收录步骤不可跳过

## ID 格式

- **project_id**: `proj_<时间戳>`（来自 `.dashboard/project.yaml`）
- **session_id**: `sess_<时间戳>`
- **task_id**: `task_<时间戳>`（每个任务不同）

## API 返回格式

`{"success": true/false, "data": ..., "error": "..."}`

## 看板地址

默认 `http://127.0.0.1:2585`
