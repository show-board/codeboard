#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Claude Code Hook → CodeBoard 全量上报脚本
# stdin: Claude Code hook 输入 JSON（含 hook_event_name）
#
# 设计原则同 Cursor hook：
# 1) SessionStart 时写入 .current_session（统一 session_id）
# 2) SessionStart/End 自动补发 session_start/complete
# 3) 每个事件生成 description 描述
# 4) 异步发送
# ============================================================

CODEBOARD_API="${CODEBOARD_API:-http://127.0.0.1:2585}"

python3 - "$CODEBOARD_API" <<'PYEOF'
import json
import re
import subprocess
import sys
import os
from pathlib import Path
from typing import Any, Dict, List

api_base = sys.argv[1].rstrip("/")

try:
    payload = json.load(sys.stdin)
except Exception:
    payload = {}

hook_name = payload.get("hook_event_name", "unknown")

pending_requests: List[tuple] = []


def queue_post(url: str, body: Dict[str, Any]) -> None:
    pending_requests.append((url, json.dumps(body, ensure_ascii=False)))


def flush_requests() -> None:
    for url, data in pending_requests:
        subprocess.Popen(
            ["curl", "-s", "-o", "/dev/null",
             "-X", "POST", url,
             "-H", "Content-Type: application/json",
             "-d", data,
             "--connect-timeout", "2", "--max-time", "5"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


def find_project_root(cwd: str) -> Path:
    current = Path(cwd) if cwd else Path.cwd()
    for parent in [current, *current.parents]:
        if (parent / ".dashboard" / "project.yaml").exists():
            return parent
        if parent == parent.parent:
            break
    return Path("")


def extract_project_id(project_root: Path) -> str:
    yaml_path = project_root / ".dashboard" / "project.yaml"
    if not yaml_path.exists():
        return ""
    text = yaml_path.read_text(encoding="utf-8", errors="ignore")
    m = re.search(r'^\s*project_id:\s*"?(proj_[^"\n]+)"?\s*$', text, re.MULTILINE)
    return m.group(1).strip() if m else ""


def safe_str(val: Any, max_len: int = 500) -> str:
    s = str(val) if val else ""
    return s[:max_len] if len(s) > max_len else s


def write_current_session(project_root: Path, sid: str) -> None:
    session_file = project_root / ".dashboard" / ".current_session"
    try:
        session_file.parent.mkdir(parents=True, exist_ok=True)
        session_file.write_text(sid, encoding="utf-8")
    except Exception:
        pass


def generate_description(hook: str, p: Dict) -> str:
    """根据 hook 类型生成中文描述"""
    tool = p.get("tool_name", "")

    if hook == "SessionStart":
        source = p.get("source", "startup")
        return f"Claude Code 会话开始 [{source}]"
    if hook == "SessionEnd":
        reason = p.get("reason", "unknown")
        return f"Claude Code 会话结束 [{reason}]"
    if hook == "PreToolUse":
        ti = p.get("tool_input", {})
        detail = ""
        if tool == "Bash":
            detail = f": {safe_str(ti.get('command', '') if isinstance(ti, dict) else ti, 80)}"
        elif tool in ("Write", "Edit", "MultiEdit", "Read"):
            detail = f": {ti.get('file_path', '') if isinstance(ti, dict) else ''}"
        return f"准备调用 [{tool}]{detail}"
    if hook == "PostToolUse":
        return f"完成调用 [{tool}]"
    if hook == "Notification":
        return f"通知: {safe_str(p.get('message', ''), 100)}"
    if hook == "UserPromptSubmit":
        length = len(str(p.get("prompt", "")))
        return f"用户提交 Prompt ({length} 字符)"
    if hook in ("Stop", "SubagentStop"):
        active = "循环中" if p.get("stop_hook_active") else ""
        return f"{'子代理' if 'Sub' in hook else 'Agent'} 停止 {active}".strip()
    if hook == "PreCompact":
        trigger = p.get("trigger", "auto")
        return f"上下文压缩 [{trigger}]"

    return f"Hook: {hook}"


# ---- 提取公共字段 ----

cwd = payload.get("cwd", "")
project_dir = os.environ.get("CLAUDE_PROJECT_DIR", cwd)
project_root = find_project_root(project_dir)
project_id = extract_project_id(project_root) if str(project_root) else ""

if not project_id:
    sys.exit(0)

session_id = payload.get("session_id", "sess_unknown")

# SessionStart 写入 .current_session
if hook_name == "SessionStart":
    write_current_session(project_root, session_id)

# ---- 构建精简 payload ----

enriched: Dict[str, Any] = {}

for key in ("hook_event_name", "cwd", "session_id"):
    if key in payload:
        enriched[key] = payload[key]

if "tool_name" in payload:
    enriched["tool_name"] = payload["tool_name"]
if "tool_input" in payload:
    ti = payload["tool_input"]
    if isinstance(ti, dict):
        enriched["tool_input"] = {k: safe_str(v, 300) for k, v in ti.items()}
    else:
        enriched["tool_input"] = safe_str(ti, 500)
if "tool_response" in payload:
    tr = payload["tool_response"]
    if isinstance(tr, dict):
        enriched["tool_response_keys"] = list(tr.keys())
        enriched["tool_response_success"] = tr.get("success")
    else:
        enriched["tool_response"] = safe_str(tr, 300)

if "prompt" in payload:
    enriched["prompt_length"] = len(str(payload["prompt"]))
    enriched["prompt_preview"] = safe_str(payload["prompt"], 200)
if "stop_hook_active" in payload:
    enriched["stop_hook_active"] = payload["stop_hook_active"]
if "message" in payload:
    enriched["message"] = safe_str(payload["message"], 300)
for key in ("trigger", "custom_instructions", "source", "reason"):
    if key in payload:
        enriched[key] = safe_str(payload[key], 200)

# 生成描述
description = generate_description(hook_name, payload)
enriched["description"] = description

# ---- 状态判断 ----

status = "success"
if hook_name == "PostToolUse" and isinstance(payload.get("tool_response"), dict):
    if not payload["tool_response"].get("success", True):
        status = "error"
if hook_name == "SessionEnd" and payload.get("reason") in ("error",):
    status = "error"

# ---- SessionStart: 自动补发 ----

if hook_name == "SessionStart":
    queue_post(f"{api_base}/api/tasks/update", {
        "project_id": project_id,
        "session_id": session_id,
        "task_id": f"task_hook_cc_start_{session_id[:16]}",
        "type": "session_start",
        "goal": f"Claude Code 会话开始 ({payload.get('source', 'startup')})",
        "task_list": [],
    })

# ---- SessionEnd: 自动补发 ----

if hook_name == "SessionEnd":
    reason = payload.get("reason", "unknown")
    queue_post(f"{api_base}/api/tasks/update", {
        "project_id": project_id,
        "session_id": session_id,
        "task_id": f"task_hook_cc_end_{session_id[:16]}",
        "type": "session_complete",
        "summary": f"[hooks 自动] Claude Code 会话结束 (reason={reason})",
    })

# ---- 全量上报 ----

queue_post(f"{api_base}/api/hooks/events", {
    "project_id": project_id,
    "session_id": session_id,
    "agent_type": "claudecode",
    "hook_event_name": hook_name,
    "status": status,
    "description": description,
    "payload": enriched,
})

flush_requests()
PYEOF

exit 0
