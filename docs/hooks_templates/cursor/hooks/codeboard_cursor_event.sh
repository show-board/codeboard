#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Cursor Hook → CodeBoard 全量上报脚本
# 用法: codeboard_cursor_event.sh <hook_name>
# stdin: Cursor hook 输入 JSON
#
# 设计原则:
# 1) 全量 hooks 轨迹上报到 /api/hooks/events
# 2) sessionStart 时将 conversation_id 写入 .current_session
#    → 保证 Agent 手动 curl 时使用相同的 session_id
# 3) sessionStart 自动补发 session_start（看板卡片出现）
# 4) sessionEnd 自动补发 session_complete（带 reason/duration）
# 5) 每个事件生成人类可读的 description 字段
# 6) 异步发送，不阻塞 Agent 响应
# ============================================================

HOOK_NAME="${1:-unknown}"
RAW_INPUT="$(cat || true)"
CODEBOARD_API="${CODEBOARD_API:-http://127.0.0.1:2585}"

python3 - "$HOOK_NAME" "$RAW_INPUT" "$CODEBOARD_API" <<'PYEOF'
import json
import re
import subprocess
import sys
import os
from pathlib import Path
from typing import Any, Dict, List

hook_name = sys.argv[1]
raw_input = sys.argv[2]
api_base = sys.argv[3].rstrip("/")

try:
    payload = json.loads(raw_input) if raw_input else {}
except Exception:
    payload = {}

# ---- 异步请求队列 ----
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


def find_project_root(workspace_root: str) -> Path:
    """从 workspace_root 向上查找包含 .dashboard/project.yaml 的目录"""
    if not workspace_root:
        return Path("")
    current = Path(workspace_root)
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
    """将 conversation_id 写入 .dashboard/.current_session，供 Agent 读取复用"""
    session_file = project_root / ".dashboard" / ".current_session"
    try:
        session_file.parent.mkdir(parents=True, exist_ok=True)
        session_file.write_text(sid, encoding="utf-8")
    except Exception:
        pass


def write_current_generation(project_root: Path, gen_id: str) -> None:
    """将当前轮次的 generation_id 写入 .dashboard/.current_generation，供 Agent 读取"""
    gen_file = project_root / ".dashboard" / ".current_generation"
    try:
        gen_file.parent.mkdir(parents=True, exist_ok=True)
        gen_file.write_text(gen_id, encoding="utf-8")
    except Exception:
        pass


def read_current_session(project_root: Path) -> str:
    """从 .current_session 文件读取当前 conversation_id"""
    session_file = project_root / ".dashboard" / ".current_session"
    try:
        if session_file.exists():
            return session_file.read_text(encoding="utf-8").strip()
    except Exception:
        pass
    return ""


# ---- 生成人类可读的事件描述 ----
def generate_description(hook: str, p: Dict) -> str:
    """根据 hook 类型和 payload 内容，生成简洁的中文描述"""

    if hook == "sessionStart":
        mode = p.get("composer_mode", "agent")
        bg = "（后台）" if p.get("is_background_agent") else ""
        return f"会话开始{bg}，模式: {mode}"

    if hook == "sessionEnd":
        reason = p.get("reason", "unknown")
        dur = p.get("duration_ms")
        dur_str = f" ({dur // 1000}s)" if dur else ""
        return f"会话结束 [{reason}]{dur_str}"

    if hook in ("preToolUse", "postToolUse", "postToolUseFailure"):
        tool = p.get("tool_name", "?")
        ti = p.get("tool_input", {})
        detail = ""
        if tool == "Shell":
            cmd = ti.get("command", "") if isinstance(ti, dict) else str(ti)
            detail = f": {safe_str(cmd, 80)}"
        elif tool == "Write":
            fp = ti.get("file_path", "") if isinstance(ti, dict) else ""
            detail = f": {fp}" if fp else ""
        elif tool == "Read":
            fp = ti.get("file_path", "") if isinstance(ti, dict) else ""
            detail = f": {fp}" if fp else ""
        elif tool == "Grep":
            pat = ti.get("pattern", "") if isinstance(ti, dict) else ""
            detail = f": {safe_str(pat, 60)}" if pat else ""
        elif tool == "Task":
            desc = ti.get("description", "") if isinstance(ti, dict) else ""
            detail = f": {safe_str(desc, 60)}" if desc else ""
        elif tool == "Delete":
            fp = ti.get("path", "") if isinstance(ti, dict) else ""
            detail = f": {fp}" if fp else ""
        elif tool == "Glob":
            pat = ti.get("glob_pattern", "") if isinstance(ti, dict) else ""
            detail = f": {safe_str(pat, 60)}" if pat else ""
        else:
            if isinstance(ti, dict):
                first_val = next(iter(ti.values()), "")
                detail = f": {safe_str(first_val, 60)}" if first_val else ""

        prefix_map = {
            "preToolUse": "准备调用",
            "postToolUse": "完成调用",
            "postToolUseFailure": "调用失败",
        }
        prefix = prefix_map.get(hook, "工具")
        dur = p.get("duration")
        dur_str = f" ({dur}ms)" if dur else ""
        err = ""
        if hook == "postToolUseFailure":
            err = f" — {safe_str(p.get('error_message', ''), 80)}"
        return f"{prefix} [{tool}]{detail}{dur_str}{err}"

    if hook == "beforeShellExecution":
        cmd = p.get("command", "")
        return f"即将执行命令: {safe_str(cmd, 100)}"

    if hook == "afterShellExecution":
        cmd = p.get("command", "")
        dur = p.get("duration")
        dur_str = f" ({dur}ms)" if dur else ""
        return f"命令完成{dur_str}: {safe_str(cmd, 100)}"

    if hook in ("beforeMCPExecution", "afterMCPExecution"):
        tool = p.get("tool_name", "?")
        prefix = "即将调用" if hook.startswith("before") else "完成调用"
        return f"{prefix} MCP [{tool}]"

    if hook == "beforeReadFile":
        fp = p.get("file_path", "?")
        return f"即将读取文件: {fp}"

    if hook == "afterFileEdit":
        fp = p.get("file_path", "?")
        edits = p.get("edits", [])
        count = len(edits) if isinstance(edits, list) else 0
        return f"文件已编辑: {fp} ({count} 处修改)"

    if hook == "beforeSubmitPrompt":
        length = len(str(p.get("prompt", "")))
        return f"用户提交 Prompt ({length} 字符)"

    if hook == "preCompact":
        trigger = p.get("trigger", "auto")
        pct = p.get("context_usage_percent", "?")
        return f"上下文压缩 [{trigger}] (使用率 {pct}%)"

    if hook == "stop":
        status = p.get("status", "completed")
        tokens_in = p.get("input_tokens")
        tokens_out = p.get("output_tokens")
        token_str = ""
        if tokens_in and tokens_out:
            token_str = f" (输入 {tokens_in:,} / 输出 {tokens_out:,} tokens)"
        return f"Agent 停止 [{status}]{token_str}"

    if hook == "subagentStart":
        stype = p.get("subagent_type", "?")
        task = safe_str(p.get("task", ""), 60)
        return f"子代理启动 [{stype}]: {task}"

    if hook == "subagentStop":
        stype = p.get("subagent_type", "?")
        status = p.get("status", "?")
        dur = p.get("duration_ms")
        dur_str = f" ({dur // 1000}s)" if dur else ""
        return f"子代理完成 [{stype}] {status}{dur_str}"

    if hook == "afterAgentResponse":
        length = len(str(p.get("text", "")))
        return f"Agent 生成响应 ({length} 字符)"

    if hook == "afterAgentThought":
        dur = p.get("duration_ms")
        dur_str = f" ({dur}ms)" if dur else ""
        return f"Agent 完成思考{dur_str}"

    if hook in ("beforeTabFileRead", "afterTabFileEdit"):
        fp = p.get("file_path", "?")
        prefix = "Tab 读取" if "Read" in hook else "Tab 编辑"
        return f"{prefix}: {fp}"

    return f"Hook 事件: {hook}"


# ---- 提取公共字段 ----

workspace_roots = payload.get("workspace_roots") or []
workspace_root = workspace_roots[0] if workspace_roots else ""
project_root = find_project_root(workspace_root)
project_id = extract_project_id(project_root) if str(project_root) else ""

if not project_id:
    sys.exit(0)

# session_id: 使用 conversation_id（跨多轮稳定，作为 hook_events 的 session_id）
conversation_id = (
    payload.get("conversation_id")
    or payload.get("session_id")
    or "sess_unknown"
)
session_id = conversation_id

# generation_id: 每轮用户消息一个，用于精确区分不同轮次
generation_id = payload.get("generation_id") or ""

# 写入 conversation_id 到 .current_session
if hook_name == "sessionStart":
    write_current_session(project_root, session_id)
else:
    existing = read_current_session(project_root)
    if existing and existing != session_id:
        write_current_session(project_root, session_id)

# 每当检测到 generation_id 就写入 .current_generation（Agent 发 session_start 时读取）
if generation_id:
    write_current_generation(project_root, generation_id)

# ---- 构建精简但信息丰富的 payload ----

enriched_payload: Dict[str, Any] = {}

# 通用元信息（包含 conversation_id 和 generation_id 用于建立映射关系）
for key in ("model", "cursor_version", "user_email", "composer_mode",
            "is_background_agent", "hook_event_name",
            "conversation_id", "generation_id"):
    if key in payload and payload[key] is not None:
        enriched_payload[key] = payload[key]

# 工具相关（preToolUse / postToolUse / postToolUseFailure）
for key in ("tool_name", "tool_use_id", "cwd", "agent_message",
            "duration", "error_message", "failure_type", "is_interrupt"):
    if key in payload and payload[key] is not None:
        enriched_payload[key] = payload[key]

# tool_input / tool_output（截断）
if "tool_input" in payload:
    ti = payload["tool_input"]
    if isinstance(ti, dict):
        enriched_payload["tool_input"] = {k: safe_str(v, 300) for k, v in ti.items()}
    else:
        enriched_payload["tool_input"] = safe_str(ti, 500)

if "tool_output" in payload:
    enriched_payload["tool_output"] = safe_str(payload["tool_output"], 500)

# shell 命令相关
for key in ("command", "output", "sandbox"):
    if key in payload and payload[key] is not None:
        enriched_payload[key] = safe_str(payload[key], 500) if isinstance(payload[key], str) else payload[key]

# MCP 相关
for key in ("url", "result_json"):
    if key in payload and payload[key] is not None and key not in enriched_payload:
        enriched_payload[key] = safe_str(payload[key], 500)

# 文件操作
if "file_path" in payload:
    enriched_payload["file_path"] = payload["file_path"]
if "edits" in payload:
    edits = payload["edits"]
    enriched_payload["edits_count"] = len(edits) if isinstance(edits, list) else 0

# subagent 相关
for key in ("subagent_id", "subagent_type", "task", "description", "summary",
            "duration_ms", "message_count", "tool_call_count", "loop_count",
            "modified_files", "status", "parent_conversation_id",
            "is_parallel_worker", "git_branch", "subagent_model"):
    if key in payload and payload[key] is not None:
        enriched_payload[key] = payload[key]

# beforeSubmitPrompt
if "prompt" in payload:
    enriched_payload["prompt_length"] = len(str(payload["prompt"]))
    enriched_payload["prompt_preview"] = safe_str(payload["prompt"], 200)
if "attachments" in payload:
    enriched_payload["attachments_count"] = len(payload["attachments"]) if isinstance(payload["attachments"], list) else 0

# preCompact
for key in ("trigger", "context_usage_percent", "context_tokens",
            "context_window_size", "message_count", "messages_to_compact",
            "is_first_compaction"):
    if key in payload and payload[key] is not None:
        enriched_payload[key] = payload[key]

# stop（包含 token 统计）
for key in ("loop_count", "input_tokens", "output_tokens",
            "cache_read_tokens", "cache_write_tokens"):
    if key in payload and payload[key] is not None:
        enriched_payload[key] = payload[key]

# sessionStart
for key in ("is_background_agent", "composer_mode"):
    if key in payload and payload[key] is not None and key not in enriched_payload:
        enriched_payload[key] = payload[key]

# sessionEnd
for key in ("reason", "duration_ms", "final_status", "error_message"):
    if key in payload and payload[key] is not None and key not in enriched_payload:
        enriched_payload[key] = payload[key]

# afterAgentResponse / afterAgentThought
if "text" in payload:
    enriched_payload["text_length"] = len(str(payload["text"]))
    enriched_payload["text_preview"] = safe_str(payload["text"], 200)
if "duration_ms" in payload and "duration_ms" not in enriched_payload:
    enriched_payload["duration_ms"] = payload["duration_ms"]

# ---- 生成描述文字 ----
description = generate_description(hook_name, payload)
enriched_payload["description"] = description

# ---- 判断事件状态 ----

status = "error" if hook_name in ("postToolUseFailure",) else "success"
if hook_name == "stop" and payload.get("status") in ("error", "aborted"):
    status = "error"
if hook_name == "sessionEnd" and payload.get("reason") in ("error",):
    status = "error"

# ---- sessionStart: 自动补发 session_start ----

if hook_name == "sessionStart":
    queue_post(f"{api_base}/api/tasks/update", {
        "project_id": project_id,
        "session_id": session_id,
        "task_id": f"task_hook_session_start_{session_id[:16]}",
        "type": "session_start",
        "goal": f"Cursor 会话开始 ({payload.get('composer_mode', 'agent')})",
        "task_list": [],
        "content": json.dumps({
            "source": "cursor_hook",
            "composer_mode": payload.get("composer_mode"),
            "is_background_agent": payload.get("is_background_agent"),
            "model": payload.get("model"),
        }, ensure_ascii=False),
    })

# ---- sessionEnd: 自动补发 session_complete ----

if hook_name == "sessionEnd":
    reason = payload.get("reason", "unknown")
    duration = payload.get("duration_ms", 0)
    duration_str = f"{duration // 1000}s" if duration else "未知"
    queue_post(f"{api_base}/api/tasks/update", {
        "project_id": project_id,
        "session_id": session_id,
        "task_id": f"task_hook_session_end_{session_id[:16]}",
        "type": "session_complete",
        "summary": f"[hooks 自动] 会话结束 (reason={reason}, duration={duration_str})",
    })

# ---- 全量 hooks 上报（带 description） ----

queue_post(f"{api_base}/api/hooks/events", {
    "project_id": project_id,
    "session_id": session_id,
    "agent_type": "cursor",
    "hook_event_name": hook_name,
    "status": status,
    "description": description,
    "payload": enriched_payload,
})

flush_requests()
PYEOF

exit 0
