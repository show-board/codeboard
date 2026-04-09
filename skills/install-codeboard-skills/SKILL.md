---
name: install-codeboard-skills
description: Installs CodeBoard multi-agent skills (cursor/claudecode/openclaw) and Cursor global hooks templates. Keeps legacy codeboard skill as no-hooks fallback.
---

# 安装 CodeBoard 多 Agent Skills 与 Hooks 模板

> 目标：在不同 Agent 下使用不同 skill，并通过 hooks 提高稳定性。  
> 同时保留 `skills/codeboard` 作为无 hooks 回退方案。

## 目录说明

| 目录 | 作用 |
|------|------|
| `skills/codeboard/` | 原有无 hooks 流程（保留，不删除） |
| `skills/codeboard-cursor/` | Cursor hooks-first skill |
| `skills/codeboard-claudecode/` | Claude Code hooks-first skill |
| `skills/codeboard-openclaw/` | OpenClaw hooks-first skill |
| `docs/hooks_templates/*` | 各 Agent 的 hooks 模板与脚本 |

## Cursor 用户安装（推荐）

1. 链接 skills 到 `~/.cursor/skills`：
   ```bash
   mkdir -p ~/.cursor/skills
   REPO="<仓库绝对路径>"
   ln -sfn "$REPO/skills/codeboard-cursor" ~/.cursor/skills/codeboard-cursor
   ln -sfn "$REPO/skills/codeboard" ~/.cursor/skills/codeboard
   ln -sfn "$REPO/skills/install-codeboard-skills" ~/.cursor/skills/install-codeboard-skills
   ```

2. 安装全局 hooks（关键）：
   ```bash
   mkdir -p ~/.cursor/hooks
   cp "$REPO/docs/hooks_templates/cursor/hooks.json" ~/.cursor/hooks.json
   cp "$REPO/docs/hooks_templates/cursor/hooks/codeboard_cursor_event.sh" ~/.cursor/hooks/
   chmod +x ~/.cursor/hooks/codeboard_cursor_event.sh
   ```

3. 验证：
   ```bash
   test -f ~/.cursor/skills/codeboard-cursor/SKILL.md && echo "codeboard-cursor OK"
   test -f ~/.cursor/hooks.json && echo "cursor hooks OK"
   ```

### 一键安装（推荐）

```bash
cd "<仓库绝对路径>"
./scripts/install-hooks-cursor.sh
```

## Claude Code 用户安装（说明）

- 读取 `skills/codeboard-claudecode/SKILL.md`
- 将 `docs/hooks_templates/claudecode/settings.json` 合并到 `~/.claude/settings.json`
- 将 `docs/hooks_templates/claudecode/hooks/codeboard_claude_event.sh` 放到 `~/.claude/hooks/` 并 `chmod +x`

或执行：

```bash
cd "<仓库绝对路径>"
./scripts/install-hooks-claudecode.sh
```

## OpenClaw 用户安装（说明）

- 读取 `skills/codeboard-openclaw/SKILL.md`
- 将 `docs/hooks_templates/openclaw/codeboard-dashboard/` 复制到 `~/.openclaw/hooks/`
- 执行 `openclaw hooks enable codeboard-dashboard`

或执行：

```bash
cd "<仓库绝对路径>"
./scripts/install-hooks-openclaw.sh
```

## 兼容策略（强制保留）

- hooks 方案失败时，继续使用 `skills/codeboard/SKILL.md` 的手动 `curl` 流程
- 不要覆盖 `~/.cursor/skills-cursor/`（Cursor 内置目录）

## 总控安装脚本（推荐）

可直接使用：

```bash
cd "<仓库绝对路径>"
./scripts/install-hooks-all.sh
```

- 自动检测 Cursor / Claude Code / OpenClaw 环境
- 仅安装检测到的 Agent
- 使用 `--all` 可强制安装全部模板

