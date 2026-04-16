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

## Step 0: 项目初始化检查（首次接入必做）

> 每次对话开始时，**必须先确认项目已完成初始化**。如果项目从未接入过 CodeBoard，需要先完成初始化。

### 检查方式

\`\`\`bash
# 如果 Skill 目录下有初始化检测脚本，直接运行
python3 ~/.cursor/skills/codeboard/scripts/init_project_judge.py 2>/dev/null || echo "脚本不存在，执行手动检查"
\`\`\`

### 手动检查

1. 检查 \`.dashboard/project.yaml\` 是否存在，如果不存在：

\`\`\`bash
mkdir -p .dashboard/memories
\`\`\`

创建 \`.dashboard/project.yaml\`:
\`\`\`yaml
project_name: "你的项目名称"
project_description: "项目简要描述"
project_id: "proj_<当前时间戳>"
created_at: "<当前ISO时间>"
\`\`\`

2. 向 CodeBoard 注册:
\`\`\`bash
curl -s -X POST ${baseUrl}/api/projects/register \\
  -H "Content-Type: application/json" \\
  -d '{"project_id":"<project_id>","name":"项目名称","description":"项目描述"}'
\`\`\`

3. 验证: \`curl -s -X POST ${baseUrl}/api/projects/<project_id>/test\` → 返回 \`{"available": true}\`

4. 如果 \`project.yaml\` 已存在，读取 \`project_id\` 并测试连接，连接失败则重新注册。

---

## 执行流程概览（严格顺序）

\`\`\`
【对话开始后立即 — 先于详细规划】
  0. ★ 检查项目初始化状态（首次接入必做）
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

/**
 * 生成 .cursor/rules/codeboard.md — Cursor Agent 每次对话自动加载的规则
 * 确保 Agent 在运行时稳健调用 CodeBoard
 */
export function generateCodeboardRule(baseUrl: string): string {
  return `---
description: CodeBoard 看板对接规则 — 每次对话必须与看板同步状态
globs:
alwaysApply: true
---

# CodeBoard 看板对接（强制执行）

你正在一个已接入 CodeBoard 看板的项目中工作。**每次对话都必须按以下流程与看板同步。**

## 看板信息

- API 地址: \`${baseUrl}\`
- 项目配置: \`.dashboard/project.yaml\`（读取 project_id）
- 详细 Skills: 仓库内 \`skills/codeboard/SKILL.md\`；全局安装则为 \`~/.cursor/skills/codeboard/SKILL.md\`（首次请完整阅读）

## 强制执行流程

### Step 0: 项目初始化确认（对话开始前最先执行）

> 在执行任何操作之前，**必须先确认项目已完成 CodeBoard 初始化**。

1. **运行初始化检测脚本**（优先使用）:
\`\`\`bash
python3 ~/.cursor/skills/codeboard/scripts/init_project_judge.py
\`\`\`
如果脚本不存在，则手动检查 \`.dashboard/project.yaml\` 是否存在且包含 \`project_id\` 和 \`project_name\`。

2. **根据检测结果决定下一步**:
   - \`STATUS: INITIALIZED\` → 项目已就绪，继续后续流程
   - \`STATUS: NOT_INITIALIZED\` 或 \`INCOMPLETE_CONFIG\` → 按脚本提示完成初始化
   - \`STATUS: API_UNREACHABLE\` → CodeBoard 未运行，提醒用户启动后再继续
   - \`STATUS: NOT_REGISTERED\` → 执行 \`POST /api/projects/register\` 注册项目

### 对话开始后立即执行

1. **读取** \`.dashboard/project.yaml\` 获取 \`project_id\`
2. **立即发送 session_start**（不要等规划完成）:
\`\`\`bash
curl -s -X POST ${baseUrl}/api/tasks/update \\
  -H "Content-Type: application/json" \\
  -d '{"project_id":"<project_id>","session_id":"sess_<时间戳>","task_id":"task_<时间戳>","type":"session_start","goal":"<用户需求简述>","task_list":[]}'
\`\`\`
3. 读取 \`skills/codeboard/SKILL.md\` 了解完整流程

### 规划完成后

4. **再次** \`POST /api/tasks/update\`：\`type\` 仍为 \`session_start\`，**保持相同** \`session_id\`，请求体携带完整 \`task_list\`

### 每个任务执行时

5. 任务开始前: 发送 **task_start**
6. 任务完成后: 发送 **task_complete**

### 所有任务完成后

7. 发送 **session_complete**（summary 字段必填）
8. **强制记忆收录**: 检查 \`.dashboard/memories/\` 下 9 类记忆文件
9. **推送记忆** 到看板: \`POST /api/memories/<project_id>/sync\`

## 不可违反的规则

- ❌ 不可跳过初始化确认
- ❌ 不可跳过 session_start
- ❌ 不可在规划完成后才发送 session_start
- ❌ 不可省略 task_start 或 task_complete
- ❌ 不可省略 session_complete 的 summary
- ❌ 不可跳过记忆收录步骤
`
}

/**
 * 生成 AGENTS.md — 供支持 AGENTS.md 协议的 Agent（如 Cursor Agent）使用
 * 放置于项目根目录，Agent 启动时自动读取
 */
export function generateAgentsMd(baseUrl: string): string {
  return `# CodeBoard Agent 协议

> 本文件供 AI Agent 在项目中自动加载，确保与 CodeBoard 看板的对接稳定执行。

## 核心要求

1. **每次对话开始时**，必须先执行项目初始化检查:
   \`\`\`bash
   python3 ~/.cursor/skills/codeboard/scripts/init_project_judge.py 2>/dev/null || echo "请手动检查 .dashboard/project.yaml"
   \`\`\`

2. **确认初始化后立即发送 session_start**:
   \`\`\`bash
   curl -s -X POST ${baseUrl}/api/tasks/update \\
     -H "Content-Type: application/json" \\
     -d '{"project_id":"<project_id>","session_id":"sess_<时间戳>","task_id":"task_<时间戳>","type":"session_start","goal":"<需求简述>","task_list":[]}'
   \`\`\`

3. **每个任务**:
   - 开始前: \`POST /api/tasks/update\` type=task_start
   - 完成后: \`POST /api/tasks/update\` type=task_complete

4. **所有任务完成后**:
   - 发送 \`session_complete\`（summary 必填）
   - 执行记忆收录（\`.dashboard/memories/\` 下 9 类文件）
   - 推送记忆: \`POST /api/memories/<project_id>/sync\`

## 项目配置

- 看板 API: \`${baseUrl}\`
- 项目配置: \`.dashboard/project.yaml\`
- 记忆目录: \`.dashboard/memories/\`
- 完整 Skill: \`~/.cursor/skills/codeboard/SKILL.md\`

## ID 格式

- **project_id**: 来自 \`.dashboard/project.yaml\`
- **session_id**: \`sess_<时间戳>\`（每次对话唯一）
- **task_id**: \`task_<时间戳>\`（每个任务唯一）

## 有效 type 值

\`session_start\` | \`task_start\` | \`task_progress\` | \`task_complete\` | \`session_complete\`
`
}

/**
 * 生成 CLAUDE.md — 供 Claude Code 使用的项目指令
 * Claude Code 在项目根目录发现 CLAUDE.md 时会自动加载
 */
export function generateClaudeMd(baseUrl: string): string {
  return `# CodeBoard 看板对接（Claude Code 指令）

> 本项目已接入 CodeBoard 看板。每次对话必须按以下流程执行。

## 初始化检查

对话开始时，先确认项目初始化状态:

\`\`\`bash
python3 ~/.cursor/skills/codeboard/scripts/init_project_judge.py 2>/dev/null
\`\`\`

如果脚本不存在或返回未初始化，手动检查:
1. \`.dashboard/project.yaml\` 是否存在且包含 \`project_id\`
2. 如不存在，创建配置并注册: \`POST ${baseUrl}/api/projects/register\`

## 必须执行的步骤

### 1. 立即发送 session_start（不要等规划完成）

\`\`\`bash
curl -s -X POST ${baseUrl}/api/tasks/update \\
  -H "Content-Type: application/json" \\
  -d '{"project_id":"<project_id>","session_id":"sess_<时间戳>","task_id":"task_<时间戳>","type":"session_start","goal":"<需求简述>","task_list":[]}'
\`\`\`

### 2. 规划完成后更新 task_list

\`\`\`bash
curl -s -X POST ${baseUrl}/api/tasks/update \\
  -H "Content-Type: application/json" \\
  -d '{"project_id":"<project_id>","session_id":"<同上session_id>","task_id":"task_<新时间戳>","type":"session_start","task_list":[...]}'
\`\`\`

### 3. 每个任务: task_start → 执行 → task_complete

### 4. 完成: session_complete（summary 必填）

### 5. 记忆收录

检查 \`.dashboard/memories/\` 下 9 类文件，更新 session-history.md，推送到看板:

\`\`\`bash
curl -s -X POST ${baseUrl}/api/memories/<project_id>/sync \\
  -H "Content-Type: application/json" \\
  -d '{"files":[{"category_id":1,"title":"session-history","file_name":"session-history.md","content":"..."}]}'
\`\`\`

## 看板信息

- API: \`${baseUrl}\`
- 项目配置: \`.dashboard/project.yaml\`
- 记忆: \`.dashboard/memories/\`
`
}
