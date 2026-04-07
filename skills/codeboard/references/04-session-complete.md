# 第五阶段：Session 完成与记忆强制收录

## Step 9: 发送 Session 完成通知

**重要：`summary` 字段必须包含本次 Session 的详细任务总结，该内容会直接显示在看板卡片上。**

```bash
curl -X POST http://127.0.0.1:2585/api/tasks/update \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "<project_id>",
    "session_id": "<session_id>",
    "task_id": "task_<时间戳>",
    "type": "session_complete",
    "task_summary": "本次Session的完成总结，包含所有已完成的任务概要",
    "summary": "【必填】详细的任务总结，包括：1. 完成了哪些任务 2. 关键变更点 3. 注意事项。此内容会显示在看板Session卡片底部"
  }'
```

> `summary` 字段会直接展示在看板 Session 卡片的底部，用户可以无需点击即可预览本次执行概况。请确保内容清晰、简洁、有信息量。

---

## Step 10: 强制记忆收录（必须执行）

**所有任务完成后，必须执行记忆收录步骤。** 记忆分为 **基础记忆** 和 **运行记忆** 两类。

### 记忆分类

#### 基础记忆（1-6）— 首次运行时必须创建，后续按需更新

| # | 分类名 | 文件名 | 说明 | 更新条件 |
|---|--------|--------|------|----------|
| 1 | project-overview | `project-overview.md` | 项目功能及目的介绍 | 项目功能有变化 |
| 2 | dev-structure | `dev-structure.md` | 项目开发结构及结构描述 | 项目结构有变化 |
| 3 | session-history | `session-history.md` | Session 记录及构建历史时间线 | **每次必须更新** |
| 4 | tech-details | `tech-details.md` | 技术细节及方案（端口/语言/SQL 等）| 技术方案有变化 |
| 5 | code-style | `code-style.md` | 代码风格（强注释要求）| 代码风格有变化 |
| 6 | ui-design | `ui-design.md` | UI 设计风格 | UI 有变化 |

#### 运行记忆（7-9）— 根据本次运行情况选择性更新

| # | 分类名 | 文件名 | 说明 | 更新条件 |
|---|--------|--------|------|----------|
| 7 | bug-records | `bug-records.md` | Bug 记录、踩坑、修复记录（分类存储）| 遇到/修复了 Bug |
| 8 | vibe-config | `vibe-config.md` | VibeCoding 配置（**每次必读**）| 配置有变化 |
| 9 | reusable-code | `reusable-code.md` | 可复用的类及函数列表及作用 | 新增可复用代码 |

### 记忆收录执行步骤

1. **检查基础记忆是否存在**：调用 `GET /api/memories/<project_id>/documents` 查看已有文档
2. **如果基础记忆文件不存在**：当前 Session 必须创建对应的基础记忆文件（1-6 全部）
3. **更新 session-history.md**：每次 Session 必须追加记录（创建分类目录，进行分类存储管理）
4. **更新运行记忆**：根据本次运行情况选择性更新 7-9
5. **同步到看板**：将所有更新的记忆文件推送到 CodeBoard

### session-history.md 格式规范

```markdown
# Session 历史记录

## 2026-04-04

### sess_20260404235100 — 看板v2优化
- **目标**: 实现头像裁剪、API全屏弹窗、Skills生成器等
- **完成任务**:
  - [x] 头像功能 - 本地图片选择+1:1裁剪
  - [x] API详情弹窗改为全屏模式
  - [x] Skills模板生成功能
- **关键变更**: UserProfile.tsx, ApiDetail.tsx, SkillsGenerator.tsx
- **耗时**: ~30分钟

## 2026-04-03
### sess_20260403... — 初始化项目
...
```

---

## Step 11: 推送记忆文件到看板

```bash
curl -X POST http://127.0.0.1:2585/api/memories/<project_id>/sync \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {
        "category_id": 3,
        "title": "Session 历史记录",
        "file_name": "session-history.md",
        "content": "# Session 历史\n\n## 2026-04-04\n..."
      }
    ]
  }'
```

也可以单独创建/更新文档：

```bash
# 创建新文档
curl -X POST http://127.0.0.1:2585/api/memories/<project_id>/documents \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 1,
    "title": "文档标题",
    "file_name": "filename.md",
    "content": "文档内容..."
  }'

# 更新已有文档
curl -X PUT http://127.0.0.1:2585/api/memories/<project_id>/documents/<doc_id> \
  -H "Content-Type: application/json" \
  -d '{"title": "新标题", "content": "新内容..."}'
```
