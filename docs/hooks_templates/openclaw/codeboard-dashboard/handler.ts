import fs from "node:fs";
import path from "node:path";

// ------------------------------------------------------------
// OpenClaw Hook -> CodeBoard 事件桥接器
// 说明：
// 1) 在 command:new/reset 自动补发 session_start
// 2) 所有事件统一上报到 /api/hooks/events
// 3) task_start/task_complete/session_complete 由 Agent 按 skills 手动上报
// ------------------------------------------------------------

type OpenClawEvent = {
  type?: string;
  action?: string;
  sessionKey?: string;
  context?: Record<string, unknown>;
  timestamp?: string;
};

const CODEBOARD_API = process.env.CODEBOARD_API || "http://127.0.0.1:2585";

function readProjectId(workspaceDir: string): string {
  if (!workspaceDir) return "";
  const projectYamlPath = path.join(workspaceDir, ".dashboard", "project.yaml");
  if (!fs.existsSync(projectYamlPath)) return "";
  const content = fs.readFileSync(projectYamlPath, "utf-8");
  const match = content.match(/^\s*project_id:\s*"?([^"\n]+)"?\s*$/m);
  return match?.[1]?.trim() || "";
}

function buildHookName(event: OpenClawEvent): string {
  if (!event.type && !event.action) return "unknown";
  if (!event.action) return String(event.type);
  return `${event.type}:${event.action}`;
}

async function postJson(url: string, body: Record<string, unknown>) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // hooks 场景下默认静默失败，避免阻断主流程
  }
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

  // 在 command:new / command:reset 自动补发 session_start，减少手工触发
  if (
    event.type === "command" &&
    (event.action === "new" || event.action === "reset")
  ) {
    await postJson(`${CODEBOARD_API}/api/tasks/update`, {
      project_id: projectId,
      session_id: sessionId,
      task_id: `task_session_start_${Date.now()}`,
      type: "session_start",
      goal: "hooks 自动触发 session_start",
      task_list: [],
      content: JSON.stringify({
        source: "openclaw_hook",
        hook_event_name: hookName,
      }),
    });
  }

  await postJson(`${CODEBOARD_API}/api/hooks/events`, {
    project_id: projectId,
    session_id: sessionId,
    agent_type: "openclaw",
    hook_event_name: hookName,
    status: "success",
    payload: {
      timestamp: event.timestamp || new Date().toISOString(),
      type: event.type,
      action: event.action,
      context: event.context || {},
    },
  });
}

