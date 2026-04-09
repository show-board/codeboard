# OpenClaw 安装 CodeBoard（Hooks 优先）

> 新方案：OpenClaw 通过内部 hooks 自动上报到 CodeBoard。  
> 同时保留 `skills/codeboard` 作为无 hooks 回退。

## 前置条件

- CodeBoard 正在运行（默认 `http://127.0.0.1:2585`）
- OpenClaw Gateway 可用
- 建议设置环境变量：`CODEBOARD_API`

---

## 1）使用 OpenClaw 专属 skill

- `skills/codeboard-openclaw/SKILL.md`（hooks-first）
- `skills/codeboard/SKILL.md`（fallback）

---

## 2）安装 OpenClaw hooks

```bash
mkdir -p ~/.openclaw/hooks
REPO="/绝对路径/到/codeboard仓库"

cp -R "$REPO/docs/hooks_templates/openclaw/codeboard-dashboard" ~/.openclaw/hooks/
openclaw hooks enable codeboard-dashboard
openclaw hooks check
```

> 模板目录内含 `HOOK.md + handler.ts`，会自动把事件上报到 CodeBoard。

### 一键安装（推荐）

```bash
cd /绝对路径/到/codeboard仓库
./scripts/install-hooks-openclaw.sh
```

或用总控脚本自动检测环境：

```bash
./scripts/install-hooks-all.sh
```

---

## 3）首次初始化项目（仅第一次手动）

```bash
mkdir -p .dashboard/memories
cat > .dashboard/project.yaml << 'EOF'
project_name: "你的项目名"
project_description: "你的项目描述"
project_id: "proj_<时间戳>"
created_at: "2026-01-01T00:00:00+08:00"
EOF

curl -s -X POST http://127.0.0.1:2585/api/projects/register \
  -H "Content-Type: application/json" \
  -d '{"project_id":"proj_<时间戳>","name":"你的项目名","description":"你的项目描述"}'
```

首次接入完成后，`command:new/reset` 会自动触发 `session_start`。

---

## 4）建议监听事件

- 命令：`command:new` `command:reset` `command:stop` `command`
- 会话：`session:compact:before` `session:compact:after` `session:patch`
- 生命周期：`agent:bootstrap` `gateway:startup`
- 消息：`message:received` `message:transcribed` `message:preprocessed` `message:sent`

这些事件会统一进入 `POST /api/hooks/events`，用于会话统计面板展示。

---

## 5）回退策略

当 hooks 不可用时，继续按 `skills/codeboard/SKILL.md` 的手动流程执行即可。

详细技术说明见：`docs/HOOKS-TECHNICAL-GUIDE.md`

---

## 验证

1. 进入项目并启动 OpenClaw
2. 执行 `/new` 或 `/reset`
3. 看板出现新 Session，且在全屏右侧能查看 hooks 明细

