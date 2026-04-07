# Claude Code 安装 CodeBoard Skill 指南

> 在 Claude Code（Anthropic CLI Agent）中对接 CodeBoard：**先上报 session_start，再读记忆与规划**；API 地址须与正在运行的 CodeBoard 左侧面板一致。

## 前置条件

- CodeBoard 桌面应用**保持运行**（参考 [INSTALL.md](INSTALL.md)）
- 已安装 Claude Code CLI（`claude`）
- 记录 API 基址，默认 `http://127.0.0.1:2585`（若修改端口请全文替换下文 URL）

---

## 方式一：通过 CLAUDE.md 项目配置（推荐）

在项目根目录创建 `CLAUDE.md`（以下为终端一键写入示例，外层用 `~~~` 避免与内层 Markdown 代码块冲突）：

~~~bash
cat > CLAUDE.md << 'CLAUDE_EOF'
# CodeBoard 看板对接

每次执行任务时遵循下列顺序（不可打乱）。

## 看板地址

http://127.0.0.1:2585

## 执行流程

1. 读取 `.dashboard/project.yaml` 获取 `project_id`；若不存在则创建、注册项目后再继续
2. **立即** `POST /api/tasks/update`，`type` 为 `session_start`，`task_list` 可先为 `[]`（须在详细规划之前，看板才会出现 Session 卡片）
3. 获取记忆分类并读取必要记忆（必读 vibe-config）
4. 规划完成后，**再次** `POST session_start`（**相同** `session_id`）并携带完整 `task_list`，或在与 Session 相关的合法 `type` 请求中带 `task_list` 更新列表（勿使用无效 `type`）
5. 每个任务：`task_start` → 执行 → `task_complete`
6. 全部结束后：`session_complete`，且 **`summary` 必填**
7. 更新 `.dashboard/memories/` 下 9 类记忆文件（`session-history.md` 每次必更）
8. `POST /api/memories/<project_id>/sync`，请求体 `files` 为 **JSON 数组**；或在项目根执行 `codeboard memory sync <project_id>`

## ID 格式

- project_id: `proj_<时间戳>`（来自 `.dashboard/project.yaml`）
- session_id: `sess_<时间戳>`（整段对话固定）
- task_id: `task_<时间戳>`（每任务不同）

## 核心 API 示例

```bash
curl -X POST http://127.0.0.1:2585/api/projects/register \\
  -H "Content-Type: application/json" \\
  -d '{"project_id":"<id>","name":"<名称>","description":"<描述>"}'

curl -X POST http://127.0.0.1:2585/api/tasks/update \\
  -H "Content-Type: application/json" \\
  -d '{"project_id":"<id>","session_id":"<sid>","task_id":"<tid>","type":"session_start","goal":"<目标>","task_list":[]}'

curl -X POST http://127.0.0.1:2585/api/memories/<project_id>/sync \\
  -H "Content-Type: application/json" \\
  -d '{"files":[{"category_id":1,"title":"t","file_name":"f.md","content":"..."}]}'
```

详细分阶段说明可参考 CodeBoard 仓库：`skills/codeboard/SKILL.md` 与 `skills/codeboard/references/`。
CLAUDE_EOF
~~~

若 CodeBoard 非本机默认端口，请将文中 `http://127.0.0.1:2585` 全部替换为实际基址。

---

## 方式二：全局配置（所有项目生效）

```bash
mkdir -p ~/.claude
cat >> ~/.claude/CLAUDE.md << 'EOF'

# CodeBoard 看板对接

每次执行任务时：先 `session_start`，再读记忆与规划；结束须 `session_complete` 并同步记忆。
看板默认地址: http://127.0.0.1:2585
完整流程与 curl 示例见各项目 `CLAUDE.md` 或 CodeBoard 仓库 `skills/codeboard/`。
EOF
```

---

## 方式三：通过 .claude/settings.json 配置权限

```bash
mkdir -p .claude

cat > .claude/settings.json << 'EOF'
{
  "permissions": {
    "allow": [
      "curl http://127.0.0.1:2585/*",
      "codeboard *"
    ]
  }
}
EOF
```

若 API 基址变更，请同步修改 `allow` 中的 URL 前缀。

---

## 验证安装

1. 在项目目录执行 `claude`
2. 输入：`请检查 CodeBoard 看板连接状态`
3. 应执行 `curl http://127.0.0.1:2585/api/health`（或你的基址）并返回成功

---

## 常见问题

### Q: Claude Code 没有读取 CLAUDE.md？

确认文件在项目根目录且命名为大写 `CLAUDE.md`。

### Q: 每次 curl 都要确认？

在 `.claude/settings.json` 的 `allow` 中加入你的 CodeBoard API 前缀。

### Q: sync 报错？

`files` 必须是数组，见 [API.md](API.md)。

### Q: 多项目复用？

使用全局 `~/.claude/CLAUDE.md`，或在每个项目放置 `CLAUDE.md`。
