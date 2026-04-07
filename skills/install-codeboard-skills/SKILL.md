---
name: install-codeboard-skills
description: Installs CodeBoard Agent Skills from this repository into Cursor by symlinking skills/codeboard (and this installer) into ~/.cursor/skills. Use when cloning CodeBoard, setting up a dev environment, when CodeBoard 看板 skills are missing in Cursor, or when the user asks to enable or install CodeBoard skills.
---

# 安装 CodeBoard Cursor Skills

将本仓库内的 **CodeBoard 看板对接** Skill 注册到 Cursor 的全局技能目录，使后续对话可被 Agent 自动发现（需在 Cursor 中启用对应 Skill）。

## 仓库内路径（源）

| 目录 | 作用 |
|------|------|
| `skills/codeboard/` | 看板对接主 Skill（含 `references/`） |
| `skills/install-codeboard-skills/` | 本安装说明（可选一并链接，便于检索「安装」场景） |

## 安装步骤（Agent 应直接执行）

1. **确认源目录存在**：`<repo>/skills/codeboard/SKILL.md` 可读（`<repo>` 为当前工作区根或本仓库根目录）。

2. **创建 Cursor 技能目录**（若不存在）：
   ```bash
   mkdir -p ~/.cursor/skills
   ```

3. **符号链接（推荐，随仓库更新自动同步）**：
   ```bash
   # 将 REPO 换为实际绝对路径，例如：/Users/you/workspace/codeboard
   REPO="<仓库绝对路径>"
   ln -sfn "$REPO/skills/codeboard" ~/.cursor/skills/codeboard
   ln -sfn "$REPO/skills/install-codeboard-skills" ~/.cursor/skills/install-codeboard-skills
   ```

4. **验证**：
   ```bash
   test -f ~/.cursor/skills/codeboard/SKILL.md && echo "codeboard OK"
   test -f ~/.cursor/skills/install-codeboard-skills/SKILL.md && echo "installer OK"
   ```

5. **用户侧**：在 Cursor 设置中确认 **Agent Skills** 已开启，并在技能列表中启用 `codeboard`（及按需启用 `install-codeboard-skills`）。若刚创建链接，可重启 Cursor 或重新打开窗口。

## 不可用的常见原因

- **未链接到 `~/.cursor/skills`**：仅放在仓库 `skills/` 下时，Cursor 不会自动加载，必须链接或复制到 `~/.cursor/skills/<skill-name>/`。
- **误链到 `~/.cursor/skills-cursor/`**：该目录为 Cursor 内置技能，**不要**写入或覆盖。
- **仅复制了单个文件**：`codeboard` Skill 依赖 `references/`，必须整个目录可用（链接整个 `skills/codeboard` 目录即可）。

## 项目内副本（可选）

若希望克隆仓库的协作者「开箱」在仓库内也有链接，可在仓库中创建 `.cursor/skills/`（需提交时注意部分团队忽略该目录；更常见做法是文档 + 全局 symlink）：
```bash
mkdir -p .cursor/skills
ln -sfn "$REPO/skills/codeboard" .cursor/skills/codeboard
```

## 与内置技能的关系

若本机已存在 `~/.cursor/skills-cursor/codeboard`，与仓库版可能内容相近；**以仓库 `skills/codeboard` 为准**做项目对接时，仍建议链接 `skills/codeboard`，保证与当前仓库文档一致。

## 附加资源

- 看板 API 与流程细节：仓库内 [skills/codeboard/SKILL.md](../codeboard/SKILL.md) 及 `references/`。
