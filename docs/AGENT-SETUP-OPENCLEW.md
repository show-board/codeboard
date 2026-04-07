# OpenClaw Agent 安装 CodeBoard Skill 指南

> 在 OpenClaw 或其它兼容「文件型系统提示词」的 Agent 中接入 CodeBoard：**会话开始立即 `session_start`**，API 与正在运行的 CodeBoard 一致。

## 前置条件

- CodeBoard 桌面应用**保持运行**（参考 [INSTALL.md](INSTALL.md)）
- 已部署 OpenClaw（或同类）Agent
- API 基址默认 `http://127.0.0.1:2585`（按左侧面板实际地址修改）

---

## 方式一：复制 Skill 目录内容

CodeBoard 仓库中主 Skill 位于 **`skills/codeboard/`**（含 `SKILL.md` 与 `references/`），请勿再使用已废弃路径 `skills/SKILL.md`。

```bash
# 示例：复制到 Agent 可读目录（保留目录结构以便引用相对路径）
mkdir -p /path/to/agent/skills/codeboard
cp -R /path/to/codeboard/skills/codeboard/* /path/to/agent/skills/codeboard/
```

在 Agent 配置中引用主文件，例如：

```yaml
system_prompt_files:
  - skills/codeboard/SKILL.md
environment:
  CODEBOARD_API: "http://127.0.0.1:2585"
```

---

## 方式二：通过 AGENTS.md 配置

在项目根目录创建 `AGENTS.md`：

```bash
cat > AGENTS.md << 'EOF'
# Agent 指令

## CodeBoard 看板对接

### 看板地址
http://127.0.0.1:2585

### 执行流程（顺序强制）
1. 检查 `.dashboard/project.yaml`，缺失则创建并注册项目
2. **立即** 发送 `session_start`（`task_list` 可先 `[]`），再读取记忆（必读 vibe-config）
3. 规划完成后，用**相同** `session_id` 再次 `session_start` 并携带完整 `task_list`（勿使用无效 `type`）
4. 每任务：`task_start` → 执行 → `task_complete`
5. `session_complete`（`summary` 必填）
6. 更新 `.dashboard/memories/` 并 `POST .../sync`（`files` 为数组）

### ID 格式
- project_id: `proj_<时间戳>`
- session_id: `sess_<时间戳>`
- task_id: `task_<时间戳>`

详细 API 与 curl：CodeBoard 仓库 `skills/codeboard/SKILL.md` 与 `references/`
EOF
```

---

## 方式三：环境变量 + 启动脚本

```bash
#!/bin/bash
export CODEBOARD_API="http://127.0.0.1:2585"

if curl -s "$CODEBOARD_API/api/health" | grep -q '"success":true'; then
  echo "[CodeBoard] 看板连接正常"
else
  echo "[CodeBoard] 警告: 看板未运行，请启动 CodeBoard 桌面应用"
fi

if [ -f ".dashboard/project.yaml" ]; then
  echo "[CodeBoard] 项目配置已存在"
else
  echo "[CodeBoard] 提示: 需创建 .dashboard/project.yaml"
fi
```

---

## 验证安装

1. 启动 Agent 并进入项目目录
2. 要求 Agent：`检查 CodeBoard 看板连接状态`
3. 预期：请求 `<API>/api/health` 返回 `success: true`

---

## 常见问题

### Q: Agent 在容器内无法访问 localhost？

将 CodeBoard 监听改为 `0.0.0.0`（左侧面板），或做端口转发；并把 Agent 侧 URL 改为可达地址。

### Q: 多 Agent 并发？

使用不同 `session_id` 即可。

### Q: 自定义 API 地址？

统一修改环境变量、`AGENTS.md` 与 CodeBoard 监听配置，保持一处来源避免混用。
