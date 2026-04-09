#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------
# Claude Code 一键安装脚本
# 作用：
# 1) 合并 hooks 模板到 ~/.claude/settings.json
# 2) 安装 hook 脚本到 ~/.claude/hooks/
# ------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

CLAUDE_DIR="$HOME/.claude"
CLAUDE_HOOKS_DIR="$CLAUDE_DIR/hooks"
CLAUDE_SETTINGS="$CLAUDE_DIR/settings.json"
TEMPLATE_SETTINGS="$REPO_DIR/docs/hooks_templates/claudecode/settings.json"
TEMPLATE_SCRIPT="$REPO_DIR/docs/hooks_templates/claudecode/hooks/codeboard_claude_event.sh"

mkdir -p "$CLAUDE_HOOKS_DIR"

if [ ! -f "$TEMPLATE_SETTINGS" ] || [ ! -f "$TEMPLATE_SCRIPT" ]; then
  echo "[ERROR] Claude hooks 模板缺失，请确认仓库完整。"
  exit 1
fi

# 若已有 settings，先备份再进行 merge
if [ -f "$CLAUDE_SETTINGS" ]; then
  cp "$CLAUDE_SETTINGS" "$CLAUDE_SETTINGS.bak.$(date +%Y%m%d%H%M%S)"
fi

python3 - "$CLAUDE_SETTINGS" "$TEMPLATE_SETTINGS" <<'PY'
import json
import sys
from pathlib import Path

target = Path(sys.argv[1])
template = Path(sys.argv[2])

base = {}
if target.exists():
    try:
        base = json.loads(target.read_text(encoding="utf-8"))
    except Exception:
        base = {}

tmpl = json.loads(template.read_text(encoding="utf-8"))
base_hooks = base.get("hooks", {})
tmpl_hooks = tmpl.get("hooks", {})

# 以模板事件为准写入（不会删掉其他非 hooks 配置）
for event_name, event_value in tmpl_hooks.items():
    base_hooks[event_name] = event_value

base["hooks"] = base_hooks
target.write_text(json.dumps(base, ensure_ascii=False, indent=2), encoding="utf-8")
PY

cp "$TEMPLATE_SCRIPT" "$CLAUDE_HOOKS_DIR/codeboard_claude_event.sh"
chmod +x "$CLAUDE_HOOKS_DIR/codeboard_claude_event.sh"

echo "[OK] Claude Code hooks 安装完成。"
echo " - settings: $CLAUDE_SETTINGS"
echo " - hook script: $CLAUDE_HOOKS_DIR/codeboard_claude_event.sh"
echo
echo "下一步建议："
echo "1) 重新启动 claude 会话"
echo "2) 确认环境变量 CODEBOARD_API（默认 http://127.0.0.1:2585）"

