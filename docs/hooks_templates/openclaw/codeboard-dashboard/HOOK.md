---
name: codeboard-dashboard
description: "将 OpenClaw 全量 hooks 事件上报到 CodeBoard 看板，自动触发 session 生命周期管理"
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

该 hook 将 OpenClaw 内部事件全量转发到 CodeBoard 看板：

- `command:new` / `command:reset` → 自动补发 `session_start`（看板卡片出现）
- `command:stop` → 自动补发 `session_complete`（看板标记完成）
- 所有事件 → `POST /api/hooks/events`（记录完整 hooks 触发轨迹）

## 安装

```bash
# 复制到 OpenClaw hooks 目录
cp -r codeboard-dashboard ~/.openclaw/hooks/

# 启用
openclaw hooks enable codeboard-dashboard

# 验证
openclaw hooks check
openclaw hooks info codeboard-dashboard
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CODEBOARD_API` | `http://127.0.0.1:2585` | CodeBoard API 地址 |

## 前提条件

- 项目根目录需有 `.dashboard/project.yaml`（包含 `project_id`）
- CodeBoard 桌面应用正在运行
