# Cursor Agent 安装 CodeBoard 指南

> 让 Cursor Agent **稳定**与 CodeBoard 看板同步：正确安装 **Rules** + **Skills**，并保证 API 地址与正在运行的 CodeBoard 一致。

## 前置条件

- CodeBoard 桌面应用已安装并**保持运行**（关闭后 Agent 无法上报）
- Cursor 已开启 **Agent** 与 **Skills**（设置中确认）
- 记下左侧面板显示的 **Host:Port**（默认 `127.0.0.1:2585`），下文统称 **API 基址**，例如 `http://127.0.0.1:2585`

---

## 为什么需要 Rules + Skills 两层？

| 机制 | 路径 | 作用 |
|------|------|------|
| **Rules** | `.cursor/rules/*.md` | `alwaysApply: true` 时**每条对话都会注入**，保证「先 session_start」等硬约束 |
| **Skills** | `~/.cursor/skills/<名称>/SKILL.md` | 详细流程、curl 示例；由描述匹配或手动启用 |

**不要**把自定义 Skill 安装到 `~/.cursor/skills-cursor/`：该目录为 Cursor 内置技能，升级可能被覆盖，且不符合官方约定。

---

## 第一步：安装 Cursor Rules（必做）

### 方式 0：从本仓库复制（最简单）

若你已克隆 CodeBoard 源码仓库：

```bash
mkdir -p /你的业务项目/.cursor/rules
cp /绝对路径/codeboard/.cursor/rules/codeboard.md /你的业务项目/.cursor/rules/
```

然后用编辑器打开复制后的 `codeboard.md`，将文中的 `http://127.0.0.1:2585` **全部替换**为 CodeBoard 左侧面板显示的 API 基址（含端口）。

### 方式 1：用脚本生成（便于自定义变量）

在**目标项目根目录**执行；`API_BASE` 必须与左侧面板一致。

~~~bash
mkdir -p .cursor/rules

API_BASE="http://127.0.0.1:2585"   # ← 修改为实际 Host:Port

cat > .cursor/rules/codeboard.md << RULES_EOF
---
description: CodeBoard 看板对接规则 — 每次对话必须与看板同步状态
globs:
alwaysApply: true
---

# CodeBoard 看板对接（强制执行）

你正在一个已接入 CodeBoard 看板的项目中工作。**每次对话都必须按以下流程与看板同步。**

## 看板信息

- API 基址: ${API_BASE}（与 CodeBoard 应用左侧面板一致）
- 项目配置: `.dashboard/project.yaml`（读取 `project_id`）
- 详细 Skill: 业务仓库内若有副本则为 `skills/codeboard/SKILL.md`；否则读 `~/.cursor/skills/codeboard/SKILL.md`

## 强制执行流程

### 对话开始后立即执行（在做任何事之前）

1. 读取 `.dashboard/project.yaml` 获取 `project_id`
2. 立即发送 `session_start`（`task_list` 可先为 `[]`，不要等规划完成），示例（缩进为 Markdown 代码块）:

    curl -s -X POST ${API_BASE}/api/tasks/update \\
      -H "Content-Type: application/json" \\
      -d '{"project_id":"<project_id>","session_id":"sess_<时间戳>","task_id":"task_<时间戳>","type":"session_start","goal":"<用户需求简述>","task_list":[]}'

3. 再读取必要记忆（必读 vibe-config）与 Skill 全文

### 规划完成后

4. 再次 `POST /api/tasks/update`，`type` 仍为 `session_start`，**相同** `session_id`，携带完整 `task_list`（勿使用不存在的 `type`）

### 每个任务

5. `task_start` → 执行 → `task_complete`

### 收尾

6. `session_complete`（`summary` 必填）
7. 更新 `.dashboard/memories/` 下 9 类记忆（`session-history.md` 每次必更）
8. `POST /api/memories/<project_id>/sync`，`files` 必须为数组；或在项目根执行 `codeboard memory sync <project_id>`

## 不可违反

- 不可跳过或延后 **session_start**
- 不可省略 **task_start** / **task_complete**
- 不可省略 **session_complete** 的 **summary**
- 不可跳过记忆收录与同步
RULES_EOF
~~~

> **注意**：此处 heredoc 结束符 `RULES_EOF` 必须顶格、单独一行。若改用 `<< 'RULES_EOF'`，则 `${API_BASE}` 不会被展开，需生成后手动替换地址。

---

## 第二步：安装 Skills（必做）

Cursor 只认 **`~/.cursor/skills/<技能目录>/SKILL.md`**（或项目内 `.cursor/skills/`，结构相同）。**推荐符号链接**，这样仓库内 `skills/codeboard/references/` 会一并生效。

### 方式 A：符号链接（推荐）

在已克隆的 **CodeBoard 仓库**外，任选一终端执行（把 `REPO` 换成你的绝对路径）：

```bash
mkdir -p ~/.cursor/skills
REPO="/绝对路径/到/codeboard仓库"
ln -sfn "$REPO/skills/codeboard" ~/.cursor/skills/codeboard
ln -sfn "$REPO/skills/install-codeboard-skills" ~/.cursor/skills/install-codeboard-skills

test -f ~/.cursor/skills/codeboard/SKILL.md && echo "codeboard skill OK"
```

### 方式 B：应用内「Skills 生成器」

1. 启动 CodeBoard，点击左侧面板服务地址旁的 **魔法棒**
2. 生成内容已包含当前 Host:Port
3. 保存对话框中请将文件存为：`~/.cursor/skills/codeboard/SKILL.md`（若目录不存在先 `mkdir -p ~/.cursor/skills/codeboard`）

单文件模板**不含** `references/`，复杂流程请以仓库 `skills/codeboard/` 为准或配合文档使用。

### 方式 C：项目内仅本仓库协作

```bash
mkdir -p .cursor/skills
REPO="/绝对路径/到/codeboard仓库"
ln -sfn "$REPO/skills/codeboard" .cursor/skills/codeboard
```

### 启用 Skill

打开 Cursor **Settings → Rules / Skills**，确认 **codeboard**（及可选 **install-codeboard-skills**）已启用。修改 `~/.cursor/skills` 后如未识别，重启 Cursor。

---

## 第三步：初始化 `.dashboard` 与注册项目

```bash
mkdir -p .dashboard/memories

cat > .dashboard/project.yaml << 'EOF'
project_name: "你的项目名称"
project_description: "项目描述"
project_id: "proj_<时间戳>"
created_at: "<当前时间 ISO>"
EOF

curl -s -X POST http://127.0.0.1:2585/api/projects/register \
  -H "Content-Type: application/json" \
  -d '{"project_id":"proj_<时间戳>","name":"项目名称","description":"描述"}'
```

将 `http://127.0.0.1:2585` 换成你的 API 基址。

---

## 稳定使用检查清单

- [ ] CodeBoard 应用**正在运行**，health 正常：`curl -s <API基址>/api/health`
- [ ] Rules 中 API 与左侧面板 **Host:Port** 一致
- [ ] `~/.cursor/skills/codeboard/SKILL.md` 存在且 Cursor 已启用该 Skill
- [ ] 项目根存在 `.dashboard/project.yaml` 且 `project_id` 已在看板注册
- [ ] 记忆同步：在项目根执行 `codeboard memory sync <project_id>`（勿在 `cli/` 子目录执行，否则找不到 `.dashboard/memories`）

---

## 验证安装

1. 用 Cursor 打开已配置的项目，新建 Agent 对话
2. 观察是否**最先**出现对 `session_start` 的 `curl`（早于长篇规划）
3. 打开 CodeBoard，确认新 Session 卡片出现
4. 任务执行过程中有 `task_start` / `task_complete`，结束时有 `session_complete` 与记忆同步

---

## 常见问题

### Agent 仍不发送 session_start？

- 确认 `.cursor/rules/codeboard.md` 存在且 frontmatter 含 `alwaysApply: true`
- 重启 Cursor；检查该文件是否被 `.cursorignore` 排除

### Skills 不生效？

- 确认路径是 **`~/.cursor/skills/codeboard/SKILL.md`**，而不是散落的 `codeboard-SKILL.md` 且无父目录
- 勿把自定义内容放进 `~/.cursor/skills-cursor/`

### sync 报错 `files 必须为数组`？

- `POST /api/memories/<project_id>/sync` 的 body 必须为 `{"files":[...]}`，见 [API.md](API.md)

### 只想拷贝文件、不用 symlink？

- 必须拷贝整个目录：`cp -R <REPO>/skills/codeboard ~/.cursor/skills/codeboard`，否则丢失 `references/`

---

## 延伸阅读

- [INSTALL.md](INSTALL.md) — 应用与 CLI 安装
- [API.md](API.md) — 接口说明
- 仓库内 `skills/install-codeboard-skills/SKILL.md` — 安装步骤的机器可读版
