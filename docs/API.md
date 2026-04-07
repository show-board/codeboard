# CodeBoard API 文档

> 默认服务地址: `http://127.0.0.1:2585`

## 项目管理

### POST /api/projects/register
注册新项目，校验 name/ID 唯一性。

**请求体:**
```json
{
  "project_id": "proj_20260404153500",
  "name": "我的项目",
  "description": "项目描述"
}
```

**成功响应:** `{"success": true, "data": {"id": 1, "project_id": "...", "color": "#007AFF"}}`
**冲突响应:** `{"success": false, "error": "项目 ID 或名称已存在"}`

### GET /api/projects
获取所有项目列表。

### GET /api/projects/:projectId
获取单个项目详情。

### PUT /api/projects/:projectId
更新项目名称/描述。

### PATCH /api/projects/:projectId/status
修改项目状态 (`visible` / `hidden` / `trashed`)。

### PATCH /api/projects/:projectId/color
修改项目颜色 (HEX 格式如 `#FF0000`)。

### POST /api/projects/:projectId/test
测试项目连接可用性。

### DELETE /api/projects/:projectId
永久删除项目（仅垃圾篓中的可删除）。

---

## Session 管理

### POST /api/sessions
创建新 Session。

**请求体:**
```json
{
  "session_id": "sess_20260404160000",
  "project_id": "proj_20260404153500",
  "goal": "实现用户登录功能",
  "task_list": [{"name": "任务1", "status": "queued"}]
}
```

### GET /api/sessions/:projectId
获取项目的所有 Session 列表。

### PUT /api/sessions/:sessionId
更新 Session 状态/总结。

---

## 任务更新（核心接口）

### POST /api/tasks/update
推送任务状态更新。Agent 在每个任务节点调用此接口。

**请求体:**
```json
{
  "project_id": "proj_20260404153500",
  "session_id": "sess_20260404160000",
  "task_id": "task_20260404160530",
  "type": "session_start | task_start | task_progress | task_complete | session_complete",
  "task_name": "任务名称",
  "task_plan": "执行计划",
  "task_summary": "完成总结",
  "content": "详细信息",
  "task_list": [{"name": "任务", "status": "running"}],
  "goal": "Session目标",
  "summary": "Session总结"
}
```

**`type` 说明（仅允许下列取值，自定义值会返回 400）:**
- `session_start`: 创建或更新 Session；**应在对话尽早调用**。可带 `task_list`（可先 `[]`）；规划结束后可用**相同** `session_id` **再次** `session_start` 并携带完整 `task_list` 更新看板任务列表
- `task_start`: 单个任务启动
- `task_progress`: 任务进展更新
- `task_complete`: 单个任务完成
- `session_complete`: 整个 Session 完成（`summary` 建议必填，会显示在看板）

**`task_list` 注意:** 不可使用非法 `type` 仅为了更新列表；合法做法为上述「再次 `session_start`」或在带 `task_list` 的其他合法 `type` 中由服务端合并进 Session（实现见服务端 `tasks` 路由）。

### GET /api/tasks/:sessionId
获取 Session 的所有任务更新记录。

---

## 记忆管理

### GET /api/memories/:projectId/categories
获取记忆分类表。

### POST /api/memories/:projectId/categories
创建新分类。

### GET /api/memories/:projectId/documents
获取记忆文档列表。支持 `?category_id=` 过滤。

### GET /api/memories/:projectId/documents/:docId
读取单个文档内容。

### POST /api/memories/:projectId/documents
创建记忆文档。

### PUT /api/memories/:projectId/documents/:docId
更新文档内容。

### DELETE /api/memories/:projectId/documents/:docId
删除文档。

### POST /api/memories/:projectId/sync
批量同步记忆文件。

**请求体（必填 `files` 数组，否则 400）:**
```json
{
  "files": [
    {
      "category_id": 1,
      "title": "文档标题",
      "file_name": "session-history.md",
      "content": "# Markdown 正文",
      "action": "upsert"
    }
  ]
}
```

- `action` 为 `delete` 时可删除本地与库中对应记录（详见实现）
- 使用官方 CLI 时可在**项目根**执行 `codeboard memory sync <projectId>`，由 CLI 读取 `.dashboard/memories/*.md` 组装 `files`

---

## 系统

### GET /api/health
健康检查。

### GET /api/recommendations
获取推荐任务列表。

### GET /api/settings
获取用户设置。

### PUT /api/settings
更新用户设置。

### GET /api/docs
获取 API 文档（JSON 格式）。

### GET /api/skills/generate
生成供 Cursor 等 Agent 使用的 **单文件** CodeBoard Skill（Markdown）。Query：`host`、`port`（可选，默认与当前服务一致）。

**响应示例:**
```json
{
  "success": true,
  "data": {
    "filename": "SKILL.md",
    "content": "---\\nname: codeboard\\n..."
  }
}
```

保存时建议路径：`~/.cursor/skills/codeboard/SKILL.md`（需先 `mkdir -p ~/.cursor/skills/codeboard`）。完整带 `references/` 的安装方式见 [AGENT-SETUP-CURSOR.md](AGENT-SETUP-CURSOR.md)。

### GET /api/notifications/unread
获取未读通知。

### POST /api/notifications/read
标记通知已读。
