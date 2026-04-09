---
name: codeboard-dashboard
description: "将 OpenClaw hooks 事件持续上报到 CodeBoard 看板"
metadata:
  openclaw:
    emoji: "📡"
    events:
      - "command:new"
      - "command:reset"
      - "command:stop"
      - "command"
      - "session:compact:before"
      - "session:compact:after"
      - "session:patch"
      - "agent:bootstrap"
      - "gateway:startup"
      - "message:received"
      - "message:transcribed"
      - "message:preprocessed"
      - "message:sent"
    requires:
      bins:
        - "node"
---

# CodeBoard Dashboard Hook

该 hook 用于把 OpenClaw 内部 hooks 事件转发到 CodeBoard：

- `POST /api/tasks/update`：在 `command:new/reset` 自动触发 `session_start`
- `POST /api/hooks/events`：记录完整 hooks 触发轨迹

安装到 `~/.openclaw/hooks/codeboard-dashboard/` 后，执行：

```bash
openclaw hooks enable codeboard-dashboard
openclaw hooks check
```

