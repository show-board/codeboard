#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------
# Cursor 一键安装脚本
# 作用：
# 1) 安装 hooks 配置到 ~/.cursor/hooks.json
# 2) 安装 hooks 脚本到 ~/.cursor/hooks/
# 3) 链接 hooks-first 与 fallback skills 到 ~/.cursor/skills/
# ------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

CURSOR_DIR="$HOME/.cursor"
CURSOR_HOOKS_DIR="$CURSOR_DIR/hooks"
CURSOR_SKILLS_DIR="$CURSOR_DIR/skills"

mkdir -p "$CURSOR_HOOKS_DIR" "$CURSOR_SKILLS_DIR"

TEMPLATE_HOOKS_JSON="$REPO_DIR/docs/hooks_templates/cursor/hooks.json"
TEMPLATE_HOOK_SCRIPT="$REPO_DIR/docs/hooks_templates/cursor/hooks/codeboard_cursor_event.sh"

if [ ! -f "$TEMPLATE_HOOKS_JSON" ] || [ ! -f "$TEMPLATE_HOOK_SCRIPT" ]; then
  echo "[ERROR] Cursor hooks 模板缺失，请确认仓库完整。"
  exit 1
fi

# 备份旧配置（如果存在）
if [ -f "$CURSOR_DIR/hooks.json" ]; then
  cp "$CURSOR_DIR/hooks.json" "$CURSOR_DIR/hooks.json.bak.$(date +%Y%m%d%H%M%S)"
fi

cp "$TEMPLATE_HOOKS_JSON" "$CURSOR_DIR/hooks.json"
cp "$TEMPLATE_HOOK_SCRIPT" "$CURSOR_HOOKS_DIR/codeboard_cursor_event.sh"
chmod +x "$CURSOR_HOOKS_DIR/codeboard_cursor_event.sh"

# skills：hooks-first + fallback + installer
ln -sfn "$REPO_DIR/skills/codeboard-cursor" "$CURSOR_SKILLS_DIR/codeboard-cursor"
ln -sfn "$REPO_DIR/skills/codeboard" "$CURSOR_SKILLS_DIR/codeboard"
ln -sfn "$REPO_DIR/skills/install-codeboard-skills" "$CURSOR_SKILLS_DIR/install-codeboard-skills"

echo "[OK] Cursor hooks 与 skills 安装完成。"
echo " - hooks.json: $CURSOR_DIR/hooks.json"
echo " - hook script: $CURSOR_HOOKS_DIR/codeboard_cursor_event.sh"
echo " - skills: codeboard-cursor / codeboard / install-codeboard-skills"
echo
echo "下一步建议："
echo "1) 重启 Cursor 或重新打开窗口"
echo "2) 确认环境变量 CODEBOARD_API（默认 http://127.0.0.1:2585）"

