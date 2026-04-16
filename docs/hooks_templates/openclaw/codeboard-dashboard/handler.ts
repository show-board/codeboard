import fs from "node:fs";
import path from "node:path";

// ============================================================
// OpenClaw Hook → CodeBoard 全量事件桥接器
//
// 设计原则：
// 1) command:new/reset → 自动补发 session_start + 写入 .current_session
// 2) command:stop → 自动补发 session_complete
// 3) 所有事件 → 上报到 /api/hooks/events（含 description 描述文字）
// 4) task_start/task_complete 由 Agent 按 skills 手动上报
// ============================================================

type OpenClawEvent = {
  type?: string;
  action?: string;
  sessionKey?: string;
  timestamp?: string;
  messages?: string[];
  context?: Record<string, unknown>;
};

const CODEBOARD_API = process.env.CODEBOARD_API || "http://127.0.0.1:2585";

function readProjectId(workspaceDir: string): string {
  if (!workspaceDir) return "";
  const yamlPath = path.join(workspaceDir, ".dashboard", "project.yaml");
  if (!fs.existsSync(yamlPath)) return "";
  const content = fs.readFileSync(yamlPath, "utf-8");
  const match = content.match(/^\s*project_id:\s*"?([^"\n]+)"?\s*$/m);
  return match?.[1]?.trim() || "";
}

function buildHookName(event: OpenClawEvent): string {
  if (!event.type && !event.action) return "unknown";
  if (!event.action) return String(event.type);
  return `${event.type}:${event.action}`;
}

function safeStr(val: unknown, maxLen = 500): string {
  const s = val != null ? String(val) : "";
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

/** 将 session_id 写入 .dashboard/.current_session */
function writeCurrentSession(workspaceDir: string, sessionId: string): void {
  try {
    const sessionFile = path.join(workspaceDir, ".dashboard", ".current_session");
    fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
    fs.writeFileSync(sessionFile, sessionId, "utf-8");
  } catch { /* 静默失败 */ }
}

/** 生成人类可读的事件描述 */
function generateDescription(hookName: string, event: OpenClawEvent): string {
  const ctx = event.context || {};

  switch (hookName) {
    case "command:new":
      return `OpenClaw 新会话 (来源: ${ctx.commandSource || "unknown"})`;
    case "command:reset":
      return "OpenClaw 会话重置";
    case "command:stop":
      return "OpenClaw 会话停止";
    case "command":
      return `命令事件: ${event.action || "unknown"}`;
    case "session:compact:before": {
      const mc = ctx.messageCount ?? "?";
      const tc = ctx.tokenCount ?? "?";
      return `开始压缩 (${mc} 消息, ${tc} tokens)`;
    }
    case "session:compact:after": {
      const before = ctx.tokensBefore ?? "?";
      const after = ctx.tokensAfter ?? "?";
      return `压缩完成 (${before} → ${after} tokens)`;
    }
    case "session:patch":
      return "会话属性修改";
    case "agent:bootstrap":
      return `Agent Bootstrap (${ctx.agentId || "?"})`;
    case "gateway:startup":
      return "Gateway 启动";
    case "message:received":
      return `收到消息 (来自: ${ctx.from || "?"}, 频道: ${ctx.channelId || "?"})`;
    case "message:transcribed":
      return `音频转写完成 (来自: ${ctx.from || "?"})`;
    case "message:preprocessed":
      return "消息预处理完成";
    case "message:sent":
      return `消息发送${ctx.success ? "成功" : "失败"} (目标: ${ctx.to || "?"})`;
    default:
      return `Hook: ${hookName}`;
  }
}

async function postJson(url: string, body: Record<string, unknown>) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* 静默失败 */ }
}

function enrichPayload(event: OpenClawEvent, hookName: string): Record<string, unknown> {
  const ctx = event.context || {};
  const enriched: Record<string, unknown> = {
    type: event.type,
    action: event.action,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  if (ctx.commandSource) enriched.commandSource = ctx.commandSource;
  if (ctx.workspaceDir) enriched.workspaceDir = ctx.workspaceDir;
  if (ctx.from) enriched.from = ctx.from;
  if (ctx.to) enriched.to = ctx.to;
  if (ctx.content) enriched.content = safeStr(ctx.content, 300);
  if (ctx.channelId) enriched.channelId = ctx.channelId;
  if (ctx.success !== undefined) enriched.success = ctx.success;
  if (ctx.transcript) enriched.transcript = safeStr(ctx.transcript, 300);
  if (ctx.bodyForAgent) enriched.bodyForAgent = safeStr(ctx.bodyForAgent, 300);
  if (ctx.agentId) enriched.agentId = ctx.agentId;
  if (Array.isArray(ctx.bootstrapFiles)) enriched.bootstrapFilesCount = ctx.bootstrapFiles.length;
  if (ctx.patch) enriched.patch = ctx.patch;

  for (const key of ["messageCount", "tokenCount", "compactedCount",
                      "summaryLength", "tokensBefore", "tokensAfter"]) {
    if (ctx[key] !== undefined) enriched[key] = ctx[key];
  }

  enriched.description = generateDescription(hookName, event);
  return enriched;
}

export default async function handler(event: OpenClawEvent) {
  const workspaceDir =
    (event.context?.workspaceDir as string) ||
    (event.context?.cfg as { workspace?: { dir?: string } })?.workspace?.dir ||
    process.cwd();

  const projectId = readProjectId(workspaceDir);
  if (!projectId) return;

  const sessionId = event.sessionKey || "sess_unknown";
  const hookName = buildHookName(event);
  const enriched = enrichPayload(event, hookName);
  const description = enriched.description as string;

  // command:new/reset → 写入 .current_session + 补发 session_start
  if (event.type === "command" && (event.action === "new" || event.action === "reset")) {
    writeCurrentSession(workspaceDir, sessionId);
    await postJson(`${CODEBOARD_API}/api/tasks/update`, {
      project_id: projectId,
      session_id: sessionId,
      task_id: `task_hook_oc_start_${Date.now()}`,
      type: "session_start",
      goal: `OpenClaw ${event.action === "new" ? "新会话" : "会话重置"}`,
      task_list: [],
    });
  }

  // command:stop → 补发 session_complete
  if (event.type === "command" && event.action === "stop") {
    await postJson(`${CODEBOARD_API}/api/tasks/update`, {
      project_id: projectId,
      session_id: sessionId,
      task_id: `task_hook_oc_end_${Date.now()}`,
      type: "session_complete",
      summary: "[hooks 自动] OpenClaw 会话结束 (command:stop)",
    });
  }

  let status = "success";
  if (event.context?.success === false) status = "error";

  await postJson(`${CODEBOARD_API}/api/hooks/events`, {
    project_id: projectId,
    session_id: sessionId,
    agent_type: "openclaw",
    hook_event_name: hookName,
    status,
    description,
    payload: enriched,
  });
}
