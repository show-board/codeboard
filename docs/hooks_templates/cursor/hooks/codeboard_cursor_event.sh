#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------
# Cursor Hook -> CodeBoard 上报脚本
# 用法: codeboard_cursor_event.sh <hook_name>
# stdin: Cursor hook 输入 JSON
# 设计原则：
# 1) hooks 只做 hooks 轨迹上报（/api/hooks/events）
# 2) 仅在会话启动时自动补发 session_start（保证卡片出现）
# 3) task_start/task_complete/session_complete 均由 Agent 按 skills 手动上报
# ------------------------------------------------------------

HOOK_NAME="${1:-unknown}"
RAW_INPUT="$(cat || true)"
CODEBOARD_API="${CODEBOARD_API:-http://127.0.0.1:2585}"

python3 - "$HOOK_NAME" "$RAW_INPUT" "$CODEBOARD_API" <<'PY'
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict

hook_name = sys.argv[1]
raw_input = sys.argv[2]
api_base = sys.argv[3].rstrip("/")

try:
    payload = json.loads(raw_input) if raw_input else {}
except Exception:
    payload = {}


def post_json(url: str, body: Dict[str, Any]) -> None:
    subprocess.run(
        [
            "curl",
            "-s",
            "-X",
            "POST",
            url,
            "-H",
            "Content-Type: application/json",
            "-d",
            json.dumps(body, ensure_ascii=False),
        ],
        check=False,
    )


def extract_project_id(workspace_root: str) -> str:
    if not workspace_root:
        return ""
    project_yaml = Path(workspace_root) / ".dashboard" / "project.yaml"
    if not project_yaml.exists():
        return ""
    text = project_yaml.read_text(encoding="utf-8", errors="ignore")
    m = re.search(r'^\s*project_id:\s*"?(proj_[^"\n]+)"?\s*$', text, re.MULTILINE)
    return m.group(1).strip() if m else ""


workspace_roots = payload.get("workspace_roots") or []
workspace_root = workspace_roots[0] if workspace_roots else ""
project_id = extract_project_id(workspace_root)

# 没有 project_id 视为项目尚未初始化，直接静默跳过
if not project_id:
    sys.exit(0)

session_id = (
    payload.get("session_id")
    or payload.get("conversation_id")
    or payload.get("generation_id")
    or ""
)
if not session_id:
    session_id = "sess_unknown"

status = "error" if hook_name in {"postToolUseFailure"} else "success"
# sessionStart 时自动补一条 session_start，仅用于创建/激活会话卡片
if hook_name == "sessionStart":
    post_json(
        f"{api_base}/api/tasks/update",
        {
            "project_id": project_id,
            "session_id": session_id,
            "task_id": f"task_session_start_{session_id}",
            "type": "session_start",
            "goal": "hooks 自动触发 session_start",
            "task_list": [],
            "content": json.dumps(
            {
                "source": "cursor_hook",
                "hook_event_name": hook_name,
                "composer_mode": payload.get("composer_mode"),
            },
            ensure_ascii=False,
            ),
        },
    )

hook_body = {
    "project_id": project_id,
    "session_id": session_id,
    "agent_type": "cursor",
    "hook_event_name": hook_name,
    "status": status,
    "payload": payload,
}

post_json(f"{api_base}/api/hooks/events", hook_body)
PY

exit 0

