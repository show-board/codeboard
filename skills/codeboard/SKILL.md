---
name: codeboard
description: Syncs AI agent work with the CodeBoard dashboard via HTTP API (session_start, task_list, task_start/complete, session_complete, memory sync). Use when working in this repository, when .dashboard/project.yaml exists, or when the user mentions CodeBoard, 看板, session sync, or task reporting.
---

# CodeBoard 项目看板对接 Skill

> 本 Skill 指导 AI Agent（如 Cursor Agent、Claude Code）在每次任务执行前后与 CodeBoard 看板进行对接，实现项目状态同步、任务进度上报、项目记忆管理。
>
> **本 Skill 中的所有步骤均为强制执行，不可跳过、不可延后。**

## 前置要求

- CodeBoard 桌面应用正在运行（默认地址 `http://127.0.0.1:2585`）
- 可通过 `curl` 直接调用 API

---

## 执行流程概览（严格按序执行）

```
【对话开始后立即执行】
  Step 1: 检查 .dashboard/project.yaml → 确认项目已注册
  Step 2: ★ 立即发送 session_start → 看板出现新卡片
  Step 3: 读取记忆（必读 vibe-config）

【规划阶段】
  Step 4: 分析需求，规划任务列表
  Step 5: 发送 task_list 更新 → 看板显示任务列表

【执行阶段 — 每个任务重复】
  Step 6: 发送 task_start → 看板标记任务开始
  Step 7: 执行任务
  Step 8: 发送 task_complete → 看板标记任务完成

【收尾阶段】
  Step 9:  发送 session_complete（必含详细 summary）→ 看板显示总结
  Step 10: 【强制】记忆收录 — 检查基础记忆(1-6) + 更新运行记忆(7-9)
  Step 11: 推送记忆到看板
```

### ⚠️ 关键规则

1. **Step 2 必须在读取记忆和规划之前执行**，确保看板立即出现新 Session 卡片
2. **Step 5 在规划完成后立即执行**，将任务列表更新到看板
3. **每个 task_start 和 task_complete 都必须发送**，不可合并或跳过
4. **session_complete 的 summary 必填**，内容直接显示在看板卡片上
5. **记忆收录不可跳过**，是 Session 完成的必须环节

---

## 分阶段详细指引

| 阶段 | 文档 | 说明 |
|------|------|------|
| Step 1 | [项目初始化与确认](references/01-project-init.md) | 检查 project.yaml、注册项目、测试连接 |
| Step 2 | [立即发送 session_start](references/03-task-report.md) | ★ 对话开始后第一时间发送 |
| Step 3 | [记忆读取](references/02-memory-read.md) | 获取分类、读取必要记忆 |
| Step 4-8 | [任务规划与执行](references/03-task-report.md) | 任务列表更新、task_start/complete 上报 |
| Step 9-11 | [Session 完成与记忆收录](references/04-session-complete.md) | 完成通知、强制记忆收录、推送同步 |
| 约定 | [执行流程与注意事项](references/06-conventions.md) | ID 格式、API 格式、强制规则 |

---

## 记忆系统（重要）

### 基础记忆（1-6）— 首次必须全部创建

1. `project-overview.md` — 项目功能及目的介绍
2. `dev-structure.md` — 项目开发结构及结构描述
3. `session-history.md` — Session 记录及构建历史时间线（**每次必须更新**）
4. `tech-details.md` — 技术细节及方案
5. `code-style.md` — 代码风格（强注释要求）
6. `ui-design.md` — UI 设计风格

### 运行记忆（7-9）— 按需更新

7. `bug-records.md` — Bug 记录/踩坑/修复记录
8. `vibe-config.md` — VibeCoding 配置（**必读**）
9. `reusable-code.md` — 可复用的类/函数列表

---

## 快速参考

### ID 格式

- **project_id**: `proj_<时间戳>` — 来自 `.dashboard/project.yaml`
- **session_id**: `sess_<时间戳>` — 每次 Session 新建
- **task_id**: `task_<时间戳>` — 每个任务不同

### API 返回格式

`{"success": true/false, "data": ..., "error": "..."}`

### 看板地址

默认 `http://127.0.0.1:2585`
