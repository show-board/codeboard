# Cursor Agent 安装 CodeBoard（Hooks 优先）

> 新方案：Cursor 使用全局 `~/.cursor/hooks.json` 自动上报。  
> 同时保留无 hooks 的 `skills/codeboard` 作为回退。

## 前置条件

- CodeBoard 正在运行（默认 `http://127.0.0.1:2585`）
- Cursor 已开启 Agent / Skills / Hooks
- 已克隆本仓库（便于直接复制模板）

---

## 1）安装 Skills（按 Agent 拆分）

```bash
mkdir -p ~/.cursor/skills
REPO="/绝对路径/到/codeboard仓库"

# hooks-first（Cursor 专用）
ln -sfn "$REPO/skills/codeboard-cursor" ~/.cursor/skills/codeboard-cursor

# 无 hooks 回退（保留）
ln -sfn "$REPO/skills/codeboard" ~/.cursor/skills/codeboard

# 安装说明 skill（可选）
ln -sfn "$REPO/skills/install-codeboard-skills" ~/.cursor/skills/install-codeboard-skills
```

---

## 2）安装全局 hooks（关键）

```bash
mkdir -p ~/.cursor/hooks
REPO="/绝对路径/到/codeboard仓库"

cp "$REPO/docs/hooks_templates/cursor/hooks.json" ~/.cursor/hooks.json
cp "$REPO/docs/hooks_templates/cursor/hooks/codeboard_cursor_event.sh" ~/.cursor/hooks/
chmod +x ~/.cursor/hooks/codeboard_cursor_event.sh
```

> `hooks.json` 放在 `~/.cursor/hooks.json` 是本方案的核心要求。

### 一键安装（推荐）

```bash
cd /绝对路径/到/codeboard仓库
./scripts/install-hooks-cursor.sh
```

或用总控脚本自动检测环境：

```bash
./scripts/install-hooks-all.sh
```

---

## 3）首次初始化项目（仅第一次手动）

hooks 负责持续上报，但项目第一次接入仍需手工初始化：

```bash
mkdir -p .dashboard/memories
cat > .dashboard/project.yaml << 'EOF'
project_name: "你的项目名"
project_description: "你的项目描述"
project_id: "proj_<时间戳>"
created_at: "2026-01-01T00:00:00+08:00"
EOF

curl -s -X POST http://127.0.0.1:2585/api/projects/register \
  -H "Content-Type: application/json" \
  -d '{"project_id":"proj_<时间戳>","name":"你的项目名","description":"你的项目描述"}'

# 首次 session_start（只需手动一次）
curl -s -X POST http://127.0.0.1:2585/api/tasks/update \
  -H "Content-Type: application/json" \
  -d '{"project_id":"proj_<时间戳>","session_id":"sess_<时间戳>","task_id":"task_<时间戳>","type":"session_start","goal":"初始化接入","task_list":[]}'
```

---

## 4）hooks 覆盖的 Cursor 事件（全量）

- `sessionStart` `sessionEnd`
- `preToolUse` `postToolUse` `postToolUseFailure`
- `subagentStart` `subagentStop`
- `beforeShellExecution` `afterShellExecution`
- `beforeMCPExecution` `afterMCPExecution`
- `beforeReadFile` `afterFileEdit`
- `beforeSubmitPrompt` `preCompact` `stop`
- `afterAgentResponse` `afterAgentThought`
- `beforeTabFileRead` `afterTabFileEdit`

这些事件会被上报到：

- `POST /api/hooks/events`（hooks 明细）
- `POST /api/tasks/update`（在 `sessionStart` 自动触发 `session_start`）

---

## 5）稳定性建议

- hooks 脚本只做轻量上报，不做阻断逻辑
- 继续保留 `skills/codeboard`，当 hooks 异常时立即回退
- 若 CodeBoard 地址不是默认值，设置环境变量：`CODEBOARD_API=http://<host>:<port>`
- 技术细节与覆盖矩阵见：`docs/HOOKS-TECHNICAL-GUIDE.md`

---

## 验证

1. 打开一个已初始化项目并发起新对话
2. 看板出现新 Session 卡片（来自 hooks 的 `sessionStart`）
3. 全屏项目后，点击左侧 Session 卡片，可在右侧看到该 session 的 hooks 统计与明细

