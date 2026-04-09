// ============================================================
// Skills 导出模板：供 GET /api/skills/generate 使用
// 与仓库 skills/codeboard/SKILL.md 流程一致，并嵌入当前 API baseUrl
// ============================================================

/**
 * 根据 baseUrl 生成单文件 Markdown Skill（可单独放入 ~/.cursor/skills/codeboard-cursor/SKILL.md）
 * 说明：该模板为 hooks-first 版本；无 hooks 回退请使用 skills/codeboard
 */
export function generateSkillsTemplate(baseUrl: string): string {
  return `---
name: codeboard-cursor
description: Cursor hooks-first skill for CodeBoard at ${baseUrl}. Keeps legacy codeboard skill as no-hooks fallback.
---

# CodeBoard Cursor Hooks Skill

> hooks-first 方案：Cursor 通过全局 hooks 自动上报。无 hooks 时回退到 \`skills/codeboard\`。

## 前置要求

- CodeBoard 正在运行，API 基址为 \`${baseUrl}\`
- 可用 \`curl\` 调用 API；可选安装 \`codeboard\` CLI（见仓库 \`cli/\`）

## 执行流程概览（严格顺序）

\`\`\`
【对话开始后立即 — 先于详细规划】
  1. 读取 .dashboard/project.yaml → project_id
  2. ★ 立即 POST session_start（task_list 可先为 []）→ 看板出现新 Session 卡片
  3. 读取必要记忆（必读 vibe-config）

【规划完成后】
  4. 再次 POST session_start（相同 session_id）并携带完整 task_list，或在与 session 相关的请求中带 task_list 以更新列表

【每个任务】
  5. task_start → 执行 → task_complete（均不可省略）

【收尾】
  6. session_complete（summary 必填）
  7. 强制记忆收录：.dashboard/memories/ 下 9 类文件，缺则建，session-history.md 必更新
  8. POST /api/memories/<project_id>/sync 推送记忆（body.files 为数组）
\`\`\`

### 关键规则

1. **session_start 必须最先发送**，不得在长篇规划之后才发，否则看板无卡片。
2. **无效 type**：仅允许 \`session_start\` | \`task_start\` | \`task_progress\` | \`task_complete\` | \`session_complete\`；不要用自定义 type 传 task_list。
3. **session_complete** 的 \`summary\` 必填。
4. **记忆收录不可跳过**。

---

## 安装到 Cursor（摘要）

- Cursor 从 \`~/.cursor/skills/<目录名>/SKILL.md\` 加载 Skill；**勿**向 \`~/.cursor/skills-cursor/\` 写入（系统保留）。
- **推荐**：克隆本仓库后执行 \`ln -sfn "<仓库绝对路径>/skills/codeboard-cursor" ~/.cursor/skills/codeboard-cursor\`。
- **单文件**：可将本模板保存为 \`~/.cursor/skills/codeboard-cursor/SKILL.md\`。
- 同时保留无 hooks 回退：\`ln -sfn "<仓库绝对路径>/skills/codeboard" ~/.cursor/skills/codeboard\`。
- 配合项目内 \`.cursor/rules/\` 规则 \`alwaysApply: true\` 更稳，参见仓库 \`docs/AGENT-SETUP-CURSOR.md\`。

---

## 记忆系统（9 类）

### 基础（1–6）首次须齐备

1. project-overview.md  
2. dev-structure.md  
3. session-history.md（**每次 Session 更新**）  
4. tech-details.md  
5. code-style.md  
6. ui-design.md  

### 运行（7–9）按需

7. bug-records.md  
8. vibe-config.md（**必读**）  
9. reusable-code.md  

---

## ID 与 API 约定

- **project_id**：来自 \`.dashboard/project.yaml\`  
- **session_id**：\`sess_<时间戳>\`，整段对话固定  
- **task_id**：\`task_<时间戳>\`，每任务不同  

返回格式：\`{"success": true/false, "data": ..., "error": "..."}\`

---

## curl 示例（将占位符替换为实际值）

### 首次 session_start（立即）

\`\`\`bash
curl -s -X POST ${baseUrl}/api/tasks/update \\
  -H "Content-Type: application/json" \\
  -d '{"project_id":"<project_id>","session_id":"sess_<时间戳>","task_id":"task_<时间戳>","type":"session_start","goal":"<简述需求>","task_list":[]}'
\`\`\`

### 规划完成后更新任务列表（相同 session_id）

\`\`\`bash
curl -s -X POST ${baseUrl}/api/tasks/update \\
  -H "Content-Type: application/json" \\
  -d '{"project_id":"<project_id>","session_id":"<同上 session_id>","task_id":"task_<新时间戳>","type":"session_start","goal":"<同上或补充>","task_list":[{"name":"任务1","status":"queued"},{"name":"任务2","status":"queued"}]}'
\`\`\`

### task_start / task_complete

\`\`\`bash
curl -s -X POST ${baseUrl}/api/tasks/update \\
  -H "Content-Type: application/json" \\
  -d '{"project_id":"<project_id>","session_id":"<session_id>","task_id":"task_<时间戳>","type":"task_start","task_name":"<名称>","task_plan":"<计划>"}'

curl -s -X POST ${baseUrl}/api/tasks/update \\
  -H "Content-Type: application/json" \\
  -d '{"project_id":"<project_id>","session_id":"<session_id>","task_id":"task_<时间戳>","type":"task_complete","task_name":"<名称>","task_summary":"<总结>"}'
\`\`\`

### session_complete

\`\`\`bash
curl -s -X POST ${baseUrl}/api/tasks/update \\
  -H "Content-Type: application/json" \\
  -d '{"project_id":"<project_id>","session_id":"<session_id>","task_id":"task_<时间戳>","type":"session_complete","summary":"<Session 总结，必填>"}'
\`\`\`

### 推送记忆（files 必须为 JSON 数组）

\`\`\`bash
curl -s -X POST ${baseUrl}/api/memories/<project_id>/sync \\
  -H "Content-Type: application/json" \\
  -d '{"files":[{"category_id":1,"title":"session-history","file_name":"session-history.md","content":"# ..."}]}'
\`\`\`

使用 CLI 时请在**项目根目录**执行：\`codeboard memory sync <project_id>\`（读取 \`.dashboard/memories/*.md\` 批量同步）。

---

## 项目注册与健康检查

\`\`\`bash
curl -s -X POST ${baseUrl}/api/projects/register \\
  -H "Content-Type: application/json" \\
  -d '{"project_id":"proj_<时间戳>","name":"项目名称","description":"描述"}'

curl -s ${baseUrl}/api/health
\`\`\`

---

## 更多文档

- 仓库内分阶段说明：\`skills/codeboard/references/\`
- 人类可读安装说明：\`docs/AGENT-SETUP-CURSOR.md\` 等
`
}
