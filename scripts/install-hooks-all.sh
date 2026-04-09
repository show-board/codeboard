#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------
# 多 Agent hooks 总控安装脚本
# 功能：
# 1) 自动检测本机是否安装/使用 Cursor、Claude Code、OpenClaw
# 2) 根据检测结果执行对应安装脚本
# 3) 输出差异化提示，说明哪些已安装、哪些未检测到
# ------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

CURSOR_INSTALLER="$REPO_DIR/scripts/install-hooks-cursor.sh"
CLAUDE_INSTALLER="$REPO_DIR/scripts/install-hooks-claudecode.sh"
OPENCLAW_INSTALLER="$REPO_DIR/scripts/install-hooks-openclaw.sh"

FORCE_ALL=0
if [ "${1:-}" = "--all" ]; then
  FORCE_ALL=1
fi

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

detect_cursor() {
  # Cursor 无稳定 CLI，可通过 app 或配置目录推断
  if [ -d "$HOME/.cursor" ] || [ -d "/Applications/Cursor.app" ] || [ -d "$HOME/Applications/Cursor.app" ]; then
    return 0
  fi
  return 1
}

detect_claude() {
  if has_cmd claude || [ -d "$HOME/.claude" ]; then
    return 0
  fi
  return 1
}

detect_openclaw() {
  if has_cmd openclaw || [ -d "$HOME/.openclaw" ]; then
    return 0
  fi
  return 1
}

run_installer() {
  local name="$1"
  local installer="$2"
  if [ ! -f "$installer" ]; then
    echo "[ERROR] $name 安装脚本不存在: $installer"
    return 1
  fi

  echo "--------------------------------------------------"
  echo "[INFO] 开始安装 $name hooks..."
  if bash "$installer"; then
    echo "[OK] $name hooks 安装完成"
    return 0
  fi

  echo "[WARN] $name hooks 安装失败，请查看上方日志"
  return 1
}

want_cursor=0
want_claude=0
want_openclaw=0

if [ "$FORCE_ALL" -eq 1 ]; then
  want_cursor=1
  want_claude=1
  want_openclaw=1
else
  if detect_cursor; then want_cursor=1; fi
  if detect_claude; then want_claude=1; fi
  if detect_openclaw; then want_openclaw=1; fi
fi

echo "[INFO] CodeBoard hooks 总控安装"
echo "[INFO] 仓库路径: $REPO_DIR"
echo "[INFO] 检测结果:"
echo " - Cursor:     $([ "$want_cursor" -eq 1 ] && echo "已检测到" || echo "未检测到")"
echo " - ClaudeCode: $([ "$want_claude" -eq 1 ] && echo "已检测到" || echo "未检测到")"
echo " - OpenClaw:   $([ "$want_openclaw" -eq 1 ] && echo "已检测到" || echo "未检测到")"
echo

if [ "$want_cursor" -eq 0 ] && [ "$want_claude" -eq 0 ] && [ "$want_openclaw" -eq 0 ]; then
  echo "[WARN] 未检测到可安装的 Agent。"
  echo "你可以使用以下方式："
  echo " - 强制安装全部：./scripts/install-hooks-all.sh --all"
  echo " - 单独安装："
  echo "   ./scripts/install-hooks-cursor.sh"
  echo "   ./scripts/install-hooks-claudecode.sh"
  echo "   ./scripts/install-hooks-openclaw.sh"
  exit 0
fi

ok_count=0
fail_count=0

if [ "$want_cursor" -eq 1 ]; then
  if run_installer "Cursor" "$CURSOR_INSTALLER"; then
    ok_count=$((ok_count + 1))
  else
    fail_count=$((fail_count + 1))
  fi
else
  echo "[SKIP] 未检测到 Cursor，跳过 Cursor hooks 安装"
fi

if [ "$want_claude" -eq 1 ]; then
  if run_installer "Claude Code" "$CLAUDE_INSTALLER"; then
    ok_count=$((ok_count + 1))
  else
    fail_count=$((fail_count + 1))
  fi
else
  echo "[SKIP] 未检测到 Claude Code，跳过 Claude hooks 安装"
fi

if [ "$want_openclaw" -eq 1 ]; then
  if run_installer "OpenClaw" "$OPENCLAW_INSTALLER"; then
    ok_count=$((ok_count + 1))
  else
    fail_count=$((fail_count + 1))
  fi
else
  echo "[SKIP] 未检测到 OpenClaw，跳过 OpenClaw hooks 安装"
fi

echo
echo "=================================================="
echo "[SUMMARY] 完成。成功: $ok_count，失败: $fail_count"
echo "建议下一步："
echo "1) 确认 CODEBOARD_API（默认 http://127.0.0.1:2585）"
echo "2) 各 Agent 重启会话后再验证 hooks 生效"
echo "3) 如需强制安装所有模板：./scripts/install-hooks-all.sh --all"

