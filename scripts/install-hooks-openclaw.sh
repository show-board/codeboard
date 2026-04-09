#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------
# OpenClaw 一键安装脚本
# 作用：
# 1) 复制 codeboard-dashboard hook 到 ~/.openclaw/hooks/
# 2) 自动启用 hook（若 openclaw 命令可用）
# ------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

OPENCLAW_HOOKS_DIR="$HOME/.openclaw/hooks"
SRC_HOOK_DIR="$REPO_DIR/docs/hooks_templates/openclaw/codeboard-dashboard"
DST_HOOK_DIR="$OPENCLAW_HOOKS_DIR/codeboard-dashboard"

mkdir -p "$OPENCLAW_HOOKS_DIR"

if [ ! -d "$SRC_HOOK_DIR" ]; then
  echo "[ERROR] OpenClaw hook 模板目录缺失：$SRC_HOOK_DIR"
  exit 1
fi

rm -rf "$DST_HOOK_DIR"
cp -R "$SRC_HOOK_DIR" "$DST_HOOK_DIR"

echo "[OK] OpenClaw hook 文件已安装到：$DST_HOOK_DIR"

if command -v openclaw >/dev/null 2>&1; then
  openclaw hooks enable codeboard-dashboard || true
  openclaw hooks check || true
  echo "[OK] 已尝试执行 openclaw hooks enable/check。"
else
  echo "[WARN] 未检测到 openclaw 命令，请手动执行："
  echo "       openclaw hooks enable codeboard-dashboard"
  echo "       openclaw hooks check"
fi

echo
echo "下一步建议："
echo "1) 重新启动 OpenClaw Gateway"
echo "2) 确认环境变量 CODEBOARD_API（默认 http://127.0.0.1:2585）"

