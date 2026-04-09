# Claude Code 安装 CodeBoard（Hooks 优先）

> 新方案：Claude Code 通过 hooks 自动上报，会话更稳定。  
> 保留 `skills/codeboard` 作为无 hooks 回退。

## 前置条件

- CodeBoard 正在运行（默认 `http://127.0.0.1:2585`）
- 已安装 `claude` CLI
- 建议保留项目级 `CLAUDE.md`（用于补充规则，不替代 hooks）

---

## 1）启用 Claude 专属 skill

在 Cursor/本地文档体系中使用：

- `skills/codeboard-claudecode/SKILL.md`（hooks-first）
- `skills/codeboard/SKILL.md`（fallback）

---

## 2）安装 hooks 配置

```bash
mkdir -p ~/.claude/hooks
REPO="/绝对路径/到/codeboard仓库"

# 合并模板到你的 ~/.claude/settings.json（不要覆盖已有其他设置）
cp "$REPO/docs/hooks_templates/claudecode/settings.json" /tmp/codeboard-claude-settings.json

# hook 脚本
cp "$REPO/docs/hooks_templates/claudecode/hooks/codeboard_claude_event.sh" ~/.claude/hooks/
chmod +x ~/.claude/hooks/codeboard_claude_event.sh
```

> `settings.json` 里需要包含模板中的 hooks 节点（可手动 merge）。

### 一键安装（推荐）

```bash
cd /绝对路径/到/codeboard仓库
./scripts/install-hooks-claudecode.sh
```

或用总控脚本自动检测环境：

```bash
./scripts/install-hooks-all.sh
```

---

## 3）首次初始化项目（仅第一次手动）

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
```

之后由 hooks 自动发送 `session_start` 与 hooks 事件。

---

## 4）Claude hooks 覆盖事件

- `PreToolUse`
- `PostToolUse`
- `Notification`
- `UserPromptSubmit`
- `Stop`
- `SubagentStop`
- `PreCompact`
- `SessionStart`
- `SessionEnd`

事件会被上报到：

- `POST /api/hooks/events`
- 在 `SessionStart` 时额外自动发送 `POST /api/tasks/update` 的 `session_start`

---

## 5）回退策略

若 hooks 不可用或异常：

- 切回 `skills/codeboard/SKILL.md`
- 按手动 `curl` 流程继续（不影响当前项目）

详细技术说明见：`docs/HOOKS-TECHNICAL-GUIDE.md`

---

## 验证

1. 进入项目执行 `claude`
2. 发起一轮对话
3. 看板出现新 Session 卡片，并在全屏右侧看到 hooks 事件统计

