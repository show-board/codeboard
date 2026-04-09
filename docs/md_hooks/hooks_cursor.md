# 钩子

钩子 让你能够使用自定义脚本来观察、控制和扩展 agent 循环。钩子 是生成的进程，通过 stdio 使用 JSON 进行双向通信。它们会在 agent 循环的定义阶段之前或之后运行，并且可以观察、阻止或修改行为。

借助 钩子，你可以：

- 在编辑后运行格式化工具
- 为事件添加分析
- 扫描 PII 或机密信息
- 为高风险操作设置门禁 (例如 SQL 写入)
- 控制 subagent (Task 工具) 的执行
- 在会话开始时注入上下文

Looking for ready-to-use integrations? See [合作伙伴集成](#partner-integrations) for security, governance, and secrets management solutions from our ecosystem partners.

Cursor 支持从 Claude Code 等第三方工具加载 钩子。有关兼容性和配置的详细信息，请参见 [Third Party 钩子](/docs/reference/third-party-hooks)。

## Agent 和 Tab 支持

钩子同时适用于 **Cursor Agent** (Cmd+K/Agent Chat) 和 **Cursor Tab** (行内补全) ，但它们使用不同的 钩子事件：

**Agent (Cmd+K/Agent Chat) ** 使用标准钩子：

- `sessionStart` / `sessionEnd` - 会话生命周期管理
- `preToolUse` / `postToolUse` / `postToolUseFailure` - 通用工具使用钩子 (对所有工具都会触发)
- `subagentStart` / `subagentStop` - subagent (Task 工具) 生命周期
- `beforeShellExecution` / `afterShellExecution` - 控制 shell 命令
- `beforeMCPExecution` / `afterMCPExecution` - 控制 MCP 工具使用
- `beforeReadFile` / `afterFileEdit` - 控制文件访问和编辑
- `beforeSubmitPrompt` - 在提交前校验 prompt
- `preCompact` - 监听上下文窗口压缩
- `stop` - 处理 Agent 完成
- `afterAgentResponse` / `afterAgentThought` - 跟踪 Agent 响应

**Tab (行内补全) ** 使用专门的钩子：

- `beforeTabFileRead` - 控制 Tab 补全的文件访问
- `afterTabFileEdit` - 对 Tab 编辑进行后处理

这些独立的钩子允许为自动化的 Tab 操作和用户驱动的 Agent 操作配置不同策略。

云端代理也会运行通过
`.cursor/hooks.json` 提交到你的代码仓库中的项目钩子。团队钩子和企业版管理的钩子尚未在
云端代理中运行。

## 快速开始

先创建一个 `hooks.json` 文件。你可以在项目级路径 (`<project>/.cursor/hooks.json`) 或主目录 (`~/.cursor/hooks.json`) 下创建。项目级钩子只对该项目生效，主目录中的钩子全局生效。

用户 hooks (~/.cursor/)项目 hooks (.cursor/)对于全局生效的用户级钩子，在 `~/.cursor/hooks.json` 中创建：

```
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [{ "command": "./hooks/format.sh" }]
  }
}
```

在 `~/.cursor/hooks/format.sh` 中创建你的钩子脚本：

```
#!/bin/bash
# 读取输入，执行处理，然后以 0 退出
cat > /dev/null
exit 0
```

将脚本设为可执行：

```
chmod +x ~/.cursor/hooks/format.sh
```

Cursor 会监视钩子配置文件并自动重新加载。现在每次编辑文件后都会执行你的钩子。

## Hook 类型

Hook 提供两种执行方式：命令驱动 (默认) 和 Prompt 驱动 (由 LLM 评估) 。

### 基于命令的 Hook

命令类 Hook 会执行 Shell 脚本，这些脚本从 stdin 接收 JSON 输入，并向 stdout 输出 JSON。

```
{
  "hooks": {
    "beforeShellExecution": [
      {
        "command": "./scripts/approve-network.sh",
        "timeout": 30,
        "matcher": "curl|wget|nc"
      }
    ]
  }
}
```

**退出码行为：**

- 退出码 `0` - Hook 成功，使用 JSON 输出
- 退出码 `2` - 阻止该操作 (等同于返回 `permission: "deny"`)
- 其他退出码 - Hook 失败，但操作继续执行 (默认失败放行)

### 基于提示的 Hook

提示 Hook 使用 LLM 来判断自然语言条件。它们适用于在不编写自定义脚本的情况下执行策略。

```
{
  "hooks": {
    "beforeShellExecution": [
      {
        "type": "prompt",
        "prompt": "Does this command look safe to execute? Only allow read-only operations.",
        "timeout": 10
      }
    ]
  }
}
```

**功能：**

- 返回结构化的 `{ ok: boolean, reason?: string }` 响应
- 使用快速模型进行快速评估
- `$ARGUMENTS` 占位符会自动替换为 hook 输入的 JSON
- 如果缺少 `$ARGUMENTS`，会自动追加 hook 输入
- 可选的 `model` 字段可用于覆盖默认的 LLM 模型

## 示例

下面的示例使用 `./hooks/...` 路径，这适用于 **用户 hooks** (`~/.cursor/hooks.json`) ，此时脚本会从 `~/.cursor/` 目录运行。对于 **项目 hooks** (`<project>/.cursor/hooks.json`) ，请改用 `.cursor/hooks/...` 路径，因为此时脚本会从项目根目录运行。

hooks.jsonaudit.shblock-git.sh```
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "command": "./hooks/session-init.sh"
      }
    ],
    "sessionEnd": [
      {
        "command": "./hooks/audit.sh"
      }
    ],
    "beforeShellExecution": [
      {
        "command": "./hooks/audit.sh"
      },
      {
        "command": "./hooks/block-git.sh"
      }
    ],
    "beforeMCPExecution": [
      {
        "command": "./hooks/audit.sh"
      }
    ],
    "afterShellExecution": [
      {
        "command": "./hooks/audit.sh"
      }
    ],
    "afterMCPExecution": [
      {
        "command": "./hooks/audit.sh"
      }
    ],
    "afterFileEdit": [
      {
        "command": "./hooks/audit.sh"
      }
    ],
    "beforeSubmitPrompt": [
      {
        "command": "./hooks/audit.sh"
      }
    ],
    "preCompact": [
      {
        "command": "./hooks/audit.sh"
      }
    ],
    "stop": [
      {
        "command": "./hooks/audit.sh"
      }
    ],
    "beforeTabFileRead": [
      {
        "command": "./hooks/redact-secrets-tab.sh"
      }
    ],
    "afterTabFileEdit": [
      {
        "command": "./hooks/format-tab.sh"
      }
    ]
  }
}
```

### TypeScript stop 自动化钩子

当你需要在同一个钩子中同时使用类型化 JSON、可靠的文件 I/O 和 HTTP 调用时，请选择 TypeScript。这个基于 Bun 的 `stop` 钩子会将每个对话的失败次数记录到磁盘，把结构化遥测数据转发到内部 API，并在智能体连续失败两次时自动安排重试。

hooks.json.cursor/hooks/track-stop.ts```
{
  "version": 1,
  "hooks": {
    "stop": [
      {
        "command": "bun run .cursor/hooks/track-stop.ts --stop"
      }
    ]
  }
}
```

将 `AGENT_TELEMETRY_URL` 设置为用于接收运行摘要的内部端点。

### Python 清单防护钩子

在需要用到丰富解析库时，Python 就能发挥优势。这个钩子使用 `pyyaml` 在执行 `kubectl apply` 之前检查 Kubernetes 清单；用 Bash 安全地解析多文档 YAML 会非常困难。

hooks.json.cursor/hooks/kube_guard.py```
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      {
        "command": "python3 .cursor/hooks/kube_guard.py"
      }
    ]
  }
}
```

在运行钩子脚本的环境中安装 PyYAML (例如 `pip install pyyaml`) ，以确保解析器可以成功导入。

## 合作伙伴集成

我们与在 Cursor 中构建了 hooks 支持的生态系统合作伙伴合作。这些集成涵盖安全扫描、治理、机密管理等功能。

### MCP 治理与可见性

合作伙伴描述[MintMCP](https://www.mintmcp.com/blog/mcp-governance-cursor-hooks)构建完整的 MCP 服务器清单，监控工具使用模式，并在响应到达 AI 模型之前扫描其中是否包含敏感数据。[Oasis Security](https://www.oasis.security/blog/cursor-oasis-governing-agentic-access)对 AI 代理操作实施最小权限策略，并在各企业系统中保留完整的审计追踪。[Runlayer](https://www.runlayer.com/blog/cursor-hooks)封装 MCP 工具，并与其 MCP broker 集成，实现对代理与工具交互的集中控制和可见性。
### 代码安全与最佳实践

合作伙伴描述[Corridor](https://corridor.dev/blog/corridor-cursor-hooks/)在代码编写过程中实时获取有关代码实现和安全设计决策的反馈。[Semgrep](https://semgrep.dev/blog/2025/cursor-hooks-mcp-server)自动扫描 AI 生成的代码以发现漏洞，并提供实时反馈，以便重新生成代码，直到安全问题得到解决。
### 依赖安全

合作伙伴描述[Endor Labs](https://www.endorlabs.com/learn/bringing-malware-detection-into-ai-coding-workflows-with-cursor-hooks)拦截包安装并扫描恶意依赖，在其进入代码库之前阻止供应链攻击。
### Agent 安全与防护

合作伙伴描述[Snyk](https://snyk.io/blog/evo-agent-guard-cursor-integration/)使用 Evo Agent Guard 实时审查 Agent 的操作，检测并防止提示注入和危险工具调用等问题。
### 机密管理

合作伙伴描述[1Password](https://marketplace.1password.com/integration/cursor-hooks)在 shell 命令执行前验证来自 1Password Environments 的环境文件是否已正确挂载，从而实现按需访问机密信息，而无需将凭据写入磁盘。
如需了解更多关于我们的 Hooks 合作伙伴的信息，请参阅博客文章 [面向安全和平台团队的 Hooks](/blog/hooks-partners)。

## 配置

在 `hooks.json` 文件中定义 hooks。配置可以存在于多个级别。来自每个来源的所有匹配 hooks 都会运行；当响应发生冲突时，合并时优先采用优先级更高的配置源：

```
~/.cursor/
├── hooks.json
└── hooks/
    ├── audit.sh
    └── block-git.sh
```

- **Enterprise** (由 MDM 管理的系统级配置) ：
- macOS: `/Library/Application Support/Cursor/hooks.json`
- Linux/WSL: `/etc/cursor/hooks.json`
- Windows: `C:\\ProgramData\\Cursor\\hooks.json`
- **Team** (云端下发，仅适用于企业版) ：
- 在 [web dashboard](https://cursor.com/dashboard/team-content?section=hooks) 中配置，并自动同步到所有团队成员
- **Project** (项目级) ：
- `<project-root>/.cursor/hooks.json`
- 项目 hooks 会在所有受信任的工作区中运行，并随项目一同提交到版本控制系统
- **User** (用户级) ：
- `~/.cursor/hooks.json`

优先级顺序 (从高到低) ：Enterprise → Team → Project → User

`hooks` 对象会将 hook 名称映射到一个 hook 定义数组。每个定义目前支持一个 `command` 属性，值可以是 shell 字符串、绝对路径或相对路径。当前工作目录取决于 hook 的来源：

- **项目 hooks** (仓库中的 `.cursor/hooks.json`) ：从 **项目根目录** 运行
- **User hooks** (`~/.cursor/hooks.json`) ：从 `~/.cursor/` 运行
- **Enterprise hooks** (系统级配置) ：从企业配置目录运行
- **Team hooks** (云端下发) ：从托管的 hooks 目录运行

对于项目 hooks，请使用 `.cursor/hooks/script.sh` 这类相对于项目根目录的路径，而不是 `./hooks/script.sh` (后者会去查找 `<project>/hooks/script.sh`) 。

### 配置文件

下面的示例展示了一个用户级 hooks 文件 (`~/.cursor/hooks.json`) 。对于项目级 hooks，请将类似 `./hooks/script.sh` 的路径修改为 `.cursor/hooks/script.sh`：

```
{
  "version": 1,
  "hooks": {
    "sessionStart": [{ "command": "./session-init.sh" }],
    "sessionEnd": [{ "command": "./audit.sh" }],
    "preToolUse": [
      {
        "command": "./hooks/validate-tool.sh",
        "matcher": "Shell|Read|Write"
      }
    ],
    "postToolUse": [{ "command": "./hooks/audit-tool.sh" }],
    "subagentStart": [{ "command": "./hooks/validate-subagent.sh" }],
    "subagentStop": [{ "command": "./hooks/audit-subagent.sh" }],
    "beforeShellExecution": [{ "command": "./script.sh" }],
    "afterShellExecution": [{ "command": "./script.sh" }],
    "afterMCPExecution": [{ "command": "./script.sh" }],
    "afterFileEdit": [{ "command": "./format.sh" }],
    "preCompact": [{ "command": "./audit.sh" }],
    "stop": [{ "command": "./audit.sh", "loop_limit": 10 }],
    "beforeTabFileRead": [{ "command": "./redact-secrets-tab.sh" }],
    "afterTabFileEdit": [{ "command": "./format-tab.sh" }]
  }
}
```

Agent 钩子 (`sessionStart`、`sessionEnd`、`preToolUse`、`postToolUse`、`postToolUseFailure`、`subagentStart`、`subagentStop`、`beforeShellExecution`、`afterShellExecution`、`beforeMCPExecution`、`afterMCPExecution`、`beforeReadFile`、`afterFileEdit`、`beforeSubmitPrompt`、`preCompact`、`stop`、`afterAgentResponse`、`afterAgentThought`) 适用于 Cmd+K 和 Agent Chat 操作。Tab 钩子 (`beforeTabFileRead`、`afterTabFileEdit`) 专门用于内联 Tab 自动补全。

### 全局配置选项

选项类型默认值描述`version`number`1`配置架构版本
### 每个脚本的配置选项

选项类型默认值描述`command`stringrequired脚本路径或命令`type``"command"` | `"prompt"``"command"`Hook 执行类型`timeout`numberplatform default执行超时时间（秒）`loop_limit`number | null`5`stop/subagentStop hooks 的每脚本循环上限。`null` 表示无限制。Cursor hooks 的默认值为 `5`，Claude Code hooks 的默认值为 `null`。`failClosed`boolean`false`当为 `true` 时，hook 失败（崩溃、超时、无效 JSON）会阻止该操作，而不是允许其继续。适用于安全关键的 hooks。`matcher`object-hook 运行时的筛选条件
### 匹配器配置

匹配器用于筛选 hook 在何时运行。匹配器作用于哪个字段取决于具体 hook：

```
{
  "hooks": {
    "preToolUse": [
      {
        "command": "./validate-shell.sh",
        "matcher": "Shell"
      }
    ],
    "subagentStart": [
      {
        "command": "./validate-explore.sh",
        "matcher": "explore|shell"
      }
    ],
    "beforeShellExecution": [
      {
        "command": "./approve-network.sh",
        "matcher": "curl|wget|nc "
      }
    ]
  }
}
```

- **subagentStart**: 匹配器会作用于 **subagent 类型**（例如 `explore`、`shell`、`generalPurpose`）。用它来只在特定类型的 subagent 启动时运行 hook。上面的示例只会为 explore 或 shell subagent 运行 `validate-explore.sh`。
- **beforeShellExecution**: 匹配器会作用于 **shell 命令**字符串。用它来只在命令匹配某种模式时运行 hook（例如网络调用、文件删除）。上面的示例只会在命令包含 `curl`、`wget` 或 `nc ` 时运行 `approve-network.sh`。

**各 hook 可用的匹配器：**

- **preToolUse / postToolUse / postToolUseFailure**: 按工具类型过滤。取值包括 `Shell`、`Read`、`Write`、`Grep`、`Delete`、`Task`，以及使用 `MCP:<tool_name>` 格式的 MCP 工具。
- **subagentStart / subagentStop**: 按 subagent 类型过滤（`generalPurpose`、`explore`、`shell` 等）。
- **beforeShellExecution / afterShellExecution**: 按 shell 命令文本过滤；匹配器会针对完整命令字符串进行匹配。
- **beforeReadFile**: 按工具类型过滤（`TabRead`、`Read` 等）。
- **afterFileEdit**: 按工具类型过滤（`TabWrite`、`Write` 等）。
- **beforeSubmitPrompt**: 匹配值 `UserPromptSubmit`。
- **stop**: 匹配值 `Stop`。
- **afterAgentResponse**: 匹配值 `AgentResponse`。
- **afterAgentThought**: 匹配值 `AgentThought`。

## 团队分发

可以通过项目 hooks (经由版本控制) 、MDM 工具或 Cursor 的云分发系统，将 hooks 分发给团队成员。

### 项目 hooks (版本控制)

项目 hooks 是与你的团队共享 Hook 的最简单方式。将一个 `hooks.json` 文件放在 `<project-root>/.cursor/hooks.json` 并提交到代码仓库中。当团队成员在受信任的工作区中打开该项目时，Cursor 会自动加载并运行项目 hooks。

当云端代理在云端处理您的代码仓库时，也会加载这些项目 hooks。

项目 hooks：

- 与代码一起存储在版本控制中
- 在受信任的工作区中会为所有团队成员自动加载
- 可以按项目定制 (例如，为特定代码库强制执行格式规范)
- 出于安全考虑，仅在工作区被标记为受信任时才会运行

### MDM 分发

使用移动设备管理 (MDM) 工具在整个组织中分发 hooks。将 `hooks.json` 文件和 hook 脚本放在每台机器的目标目录下。

**用户主目录** (按用户分发) ：

- `~/.cursor/hooks.json`
- `~/.cursor/hooks/` (用于 hook 脚本)

**全局目录** (系统级分发) ：

- macOS: `/Library/Application Support/Cursor/hooks.json`
- Linux/WSL: `/etc/cursor/hooks.json`
- Windows: `C:\\ProgramData\\Cursor\\hooks.json`

注意：基于 MDM 的分发完全由组织自行管理。Cursor 不会通过您的 MDM 解决方案部署或管理文件。请确保由组织内部的 IT 或安全团队按照组织策略负责配置、部署和更新。

### 云端分发 (仅限企业版)

企业团队可以使用 Cursor 原生的云端分发功能，将钩子自动同步到所有团队成员。可在[网页仪表板](https://cursor.com/dashboard/team-content?section=hooks)中配置钩子。团队成员登录时，Cursor 会自动将已配置的钩子分发到所有客户端机器。

云端分发提供：

- 自动同步到所有团队成员 (每三十分钟一次)
- 针对操作系统进行定向，以支持特定平台的钩子
- 通过仪表板进行集中管理

企业版管理员可以通过仪表板创建、编辑和管理团队钩子，而无需访问各个机器。

[联系销售](https://cursor.com/contact-sales?source=docs-hooks-cloud) 以获取企业版云端钩子分发。

## 参考

### 通用模式

#### 输入 (所有 hook)

所有 hook 除了各自特定的字段外，还会接收一组基础字段：

```
{
  "conversation_id": "string",
  "generation_id": "string",
  "model": "string",
  "hook_event_name": "string",
  "cursor_version": "string",
  "workspace_roots": ["<path>"],
  "user_email": "string | null",
  "transcript_path": "string | null"
}
```

字段类型描述`conversation_id`string跨多轮对话保持稳定的会话 ID`generation_id`string会随着每条用户消息变化的当前生成 ID`model`string触发该 hook 的 composer 所配置的模型`hook_event_name`string当前正在运行的 hook`cursor_version`stringCursor 应用版本 (例如 "1.7.2")`workspace_roots`string[]工作区中的根文件夹列表 (通常只有一个，但多根工作区可能有多个)`user_email`stringnull已认证用户的电子邮箱地址 (如果可用)`transcript_path`stringnull主会话记录文件的路径 (如果禁用了会话记录，则为 null)
### Hook 事件

#### preToolUse

在执行任何工具之前调用。这是一个适用于所有工具类型 (Shell、Read、Write、MCP、Task 等) 的通用 hook。使用匹配器按特定工具进行过滤。

```
// Input
{
  "tool_name": "Shell",
  "tool_input": { "command": "npm install", "working_directory": "/project" },
  "tool_use_id": "abc123",
  "cwd": "/project",
  "model": "claude-sonnet-4-20250514",
  "agent_message": "Installing dependencies..."
}

// Output
{
  "permission": "allow" | "deny",
  "user_message": "<message shown in client when denied>",
  "agent_message": "<message sent to agent when denied>",
  "updated_input": { "command": "npm ci" }
}
```

输出字段类型描述`permission`string`"allow"` 表示继续，`"deny"` 表示阻止。`"ask"` 可被 schema 接受，但目前不会对 `preToolUse` 强制执行。`user_message`string (optional)当操作被拒绝时显示给用户的消息`agent_message`string (optional)当操作被拒绝时反馈给 agent 的消息`updated_input`object (optional)改用的修改后工具输入
#### postToolUse

在工具成功执行后调用。可用于审计、分析以及注入上下文。

```
// 输入
{
  "tool_name": "Shell",
  "tool_input": { "command": "npm test" },
  "tool_output": "{\"exitCode\":0,\"stdout\":\"All tests passed\"}",
  "tool_use_id": "abc123",
  "cwd": "/project",
  "duration": 5432,
  "model": "claude-sonnet-4-20250514"
}

// 输出
{
  "updated_mcp_tool_output": { "modified": "output" },
  "additional_context": "Test coverage report attached."
}
```

输入字段类型描述`duration`number执行时间 (毫秒)`tool_output`string工具返回结果负载的 JSON 字符串 (不是原始终端文本)
输出字段类型描述`updated_mcp_tool_output`object (optional)仅适用于 MCP 工具：替换模型看到的工具输出`additional_context`string (optional)工具结果后注入到对话中的额外上下文信息
#### postToolUseFailure

当工具失败、超时或被拒绝时调用。适用于错误跟踪和恢复逻辑。

```
// Input
{
  "tool_name": "Shell",
  "tool_input": { "command": "npm test" },
  "tool_use_id": "abc123",
  "cwd": "/project",
  "error_message": "Command timed out after 30s",
  "failure_type": "timeout" | "error" | "permission_denied",
  "duration": 5000,
  "is_interrupt": false
}

// Output
{
  // No output fields currently supported
}
```

输入字段类型描述`error_message`string失败的描述`failure_type`string失败类型：`"error"`、`"timeout"` 或 `"permission_denied"``duration`number直到发生失败所经过的时间（毫秒）`is_interrupt`boolean此次失败是否由用户中断/取消导致
#### subagentStart

在启动子代理 (Task 工具) 前调用。可允许或阻止创建子代理。

```
// 输入
{
  "subagent_id": "abc-123",
  "subagent_type": "generalPurpose",
  "task": "Explore the authentication flow",
  "parent_conversation_id": "conv-456",
  "tool_call_id": "tc-789",
  "subagent_model": "claude-sonnet-4-20250514",
  "is_parallel_worker": false,
  "git_branch": "feature/auth"
}

// 输出
{
  "permission": "allow" | "deny",
  "user_message": "<message shown when denied>"
}
```

输入字段类型描述`subagent_id`string此子代理实例的唯一标识符`subagent_type`string子代理类型：`generalPurpose`、`explore`、`shell` 等。`task`string分配给子代理的任务描述`parent_conversation_id`string父级代理会话的对话 ID`tool_call_id`string触发该子代理的工具调用 ID`subagent_model`string子代理将使用的模型`is_parallel_worker`boolean此子代理是否作为并行工作线程运行`git_branch`string (optional)子代理要操作的 Git 分支 (如适用)
输出字段类型描述`permission`string`"allow"` 表示继续，`"deny"` 表示阻止。`subagentStart` 不支持 `"ask"`，并将其视为 `"deny"`。`user_message`string (optional)子代理被拒绝时向用户显示的消息
#### subagentStop

在 subagent 完成、出错或被中止时调用。可触发后续操作。

```
// 输入
{
  "subagent_type": "generalPurpose",
  "status": "completed" | "error" | "aborted",
  "task": "Explore the authentication flow",
  "description": "Exploring auth flow",
  "summary": "<subagent output summary>",
  "duration_ms": 45000,
  "message_count": 12,
  "tool_call_count": 8,
  "loop_count": 0,
  "modified_files": ["src/auth.ts"],
  "agent_transcript_path": "/path/to/subagent/transcript.txt"
}

// 输出
{
  "followup_message": "<auto-continue with this message>"
}
```

输入字段类型描述`subagent_type`stringsubagent 的类型：`generalPurpose`、`explore`、`shell` 等。`status`string`"completed"`、`"error"` 或 `"aborted"``task`string提供给 subagent 的任务描述`description`string对 subagent 目的的简要描述`summary`stringsubagent 的输出摘要`duration_ms`number执行时间 (毫秒)`message_count`numbersubagent 会话期间交换的消息数量`tool_call_count`numbersubagent 发起的工具调用次数`loop_count`number此 subagent 已触发 `subagentStop` 后续操作的次数 (从 0 开始)`modified_files`string[]subagent 修改过的文件`agent_transcript_path`stringnullsubagent 自身会话记录文件的路径 (与父对话分开)
输出字段类型描述`followup_message`string (optional)使用此消息自动继续。仅当 `status` 为 `"completed"` 时才会被处理。
`followup_message` 字段支持循环式流程：subagent 完成后会触发下一轮迭代。后续消息与 `stop` hook 一样，受相同的可配置循环上限约束 (默认值为 5，可通过 `loop_limit` 配置) 。

#### beforeShellExecution / beforeMCPExecution

在执行任何 shell 命令或 MCP 工具之前调用。返回一个权限判定结果。

默认情况下，如果 hook 失败 (崩溃、超时、无效 JSON)，操作仍会被允许继续执行 (失败即放行，fail-open)。如果希望在失败时改为阻止该操作，请在 hook 定义中设置 `failClosed: true`。对于安全性要求较高的 `beforeMCPExecution` hook，建议这样设置。

```
// beforeShellExecution 输入
{
  "command": "<full terminal command>",
  "cwd": "<current working directory>",
  "sandbox": false
}

// beforeMCPExecution 输入
{
  "tool_name": "<tool name>",
  "tool_input": "<json params>"
}
// 加上以下之一：
{ "url": "<server url>" }
// 或：
{ "command": "<command string>" }

// 输出
{
  "permission": "allow" | "deny" | "ask",
  "user_message": "<message shown in client>",
  "agent_message": "<message sent to agent>"
}
```

#### afterShellExecution

在 shell 命令执行后触发；适用于审计或从命令输出中收集指标。

```
// Input
{
  "command": "<full terminal command>",
  "output": "<full terminal output>",
  "duration": 1234,
  "sandbox": false
}
```

FieldTypeDescription`command`string执行的完整终端命令`output`string从终端捕获的完整输出`duration`number执行该 shell 命令所花费的时间（毫秒），不包括等待审批的时间`sandbox`boolean该命令是否在沙盒环境中运行
#### afterMCPExecution

在 MCP 工具执行后触发，并包含该工具的输入参数和完整的 JSON 结果。

```
// 输入
{
  "tool_name": "<tool name>",
  "tool_input": "<json params>",
  "result_json": "<tool result json>",
  "duration": 1234
}
```

字段类型描述`tool_name`string执行的 MCP 工具名称`tool_input`string传递给该工具的 JSON 参数字符串`result_json`string工具响应结果的 JSON 字符串`duration`number工具执行耗时 (毫秒) ，不包括等待审批的时间
#### afterFileEdit

在 Agent 完成文件编辑后触发；适用于格式化工具或统计 Agent 编写的代码。

```
// 输入
{
  "file_path": "<absolute path>",
  "edits": [{ "old_string": "<search>", "new_string": "<replace>" }]
}
```

#### beforeReadFile

在 Agent 读取文件之前调用。用于进行访问控制，防止将敏感文件发送给模型。

默认情况下，`beforeReadFile` hook 失败 (崩溃、超时、无效 JSON) 时会记录日志，并允许继续读取。若要在失败时改为阻止读取，请在 hook 定义中设置 `failClosed: true`。

```
// 输入
{
  "file_path": "<absolute path>",
  "content": "<file contents>",
  "attachments": [
    {
      "type": "file" | "rule",
      "file_path": "<absolute path>"
    }
  ]
}

// 输出
{
  "permission": "allow" | "deny",
  "user_message": "<message shown when denied>"
}
```

输入字段类型描述`file_path`string将要读取的文件的绝对路径`content`string文件的完整内容`attachments`array与提示关联的上下文附件。每个条目都包含一个 `type` (`"file"` 或 `"rule"`) 和一个 `file_path`。
输出字段类型描述`permission`string`"allow"` 表示继续，`"deny"` 表示阻止`user_message`string (optional)被拒绝时向用户显示的消息
#### beforeTabFileRead

在 Tab (内联补全) 读取文件之前调用。在 Tab 访问文件内容前启用脱敏或访问控制。

**与 `beforeReadFile` 的主要区别：**

- 只会被 Tab 触发，不会被 Agent 触发
- 不包含 `attachments` 字段 (Tab 不使用 prompt 附件)
- 可用于对 Tab 的自主操作应用不同策略

```
// 输入
{
  "file_path": "<absolute path>",
  "content": "<file contents>"
}

// 输出
{
  "permission": "allow" | "deny"
}
```

#### afterTabFileEdit

在 Tab (内联补全) 编辑文件后调用。可用于对 Tab 生成的代码进行格式化或审计。

**与 `afterFileEdit` 的主要区别：**

- 仅由 Tab 触发，不会被 Agent 触发
- 包含详细的编辑信息：`range`、`old_line` 和 `new_line`，便于精确追踪编辑
- 适用于对 Tab 所做编辑进行细粒度的格式化或分析

```
// 输入
{
  "file_path": "<absolute path>",
  "edits": [
    {
      "old_string": "<search>",
      "new_string": "<replace>",
      "range": {
        "start_line_number": 10,
        "start_column": 5,
        "end_line_number": 10,
        "end_column": 20
      },
      "old_line": "<line before edit>",
      "new_line": "<line after edit>"
    }
  ]
}

// 输出
{
  // 当前不支持任何输出字段
}
```

#### beforeSubmitPrompt

在用户点击发送后、发起后端请求之前立即调用。可用于阻止提交。

```
// 输入
{
  "prompt": "<user prompt text>",
  "attachments": [
    {
      "type": "file" | "rule",
      "file_path": "<absolute path>"
    }
  ]
}

// 输出
{
  "continue": true | false,
  "user_message": "<message shown to user when blocked>"
}
```

输出字段类型描述`continue`boolean是否允许提示词提交继续进行`user_message`string (optional)当提示词被阻止时向用户显示的消息
#### afterAgentResponse

在智能体完成一条助手消息后调用。

```
// 输入
{
  "text": "<assistant final text>"
}
```

#### afterAgentThought

在 Agent 完成一个思考阶段后被调用。可用于观察 Agent 的推理过程。

```
// 输入
{
  "text": "<fully aggregated thinking text>",
  "duration_ms": 5000
}

// 输出
{
  // 当前不支持任何输出字段
}
```

字段类型描述`text`string已完成思考区块的完整汇总文本`duration_ms`number (optional)思考区块的持续时间 (毫秒)
#### stop

在 Agent Loop 结束时调用。也可选择自动提交一条后续用户消息，以继续迭代。

```
// Input
{
  "status": "completed" | "aborted" | "error",
  "loop_count": 0
}
```

```
// Output
{
  "followup_message": "<message text>"
}
```

- 可选的 `followup_message` 是一个字符串。提供且非空时，Cursor 会自动将其作为下一条用户消息提交。这可启用循环式流程（例如，迭代直到达成目标）。
- `loop_count` 字段表示此 stop 钩子已为该对话自动触发后续消息的次数（从 0 开始）。默认限制为每个脚本 5 次自动后续消息，可通过 `loop_limit` 选项配置。将 `loop_limit` 设为 `null` 可移除此上限。同样的限制也适用于 `subagentStop` 的后续消息。

#### sessionStart

在创建新的 composer 会话时调用。此 hook 以即发即忘方式运行；agent 循环不会等待其完成，也不会强制要求阻塞式响应。使用此 hook 来设置会话专属环境变量或注入额外上下文。

```
// 输入
{
  "session_id": "<unique session identifier>",
  "is_background_agent": true | false,
  "composer_mode": "agent" | "ask" | "edit"
}
```

```
// 输出
{
  "env": { "<key>": "<value>" },
  "additional_context": "<context to add to conversation>"
}
```

输入字段类型描述`session_id`string此会话的唯一标识符 (与 `conversation_id` 相同)`is_background_agent`boolean该会话是后台 agent 会话还是交互式会话`composer_mode`string (optional)composer 启动时的模式 (例如 "agent"、"ask"、"edit")
输出字段类型描述`env`object (optional)为此会话设置的环境变量。对后续所有 hook 的执行均可用`additional_context`string (optional)要添加到对话初始系统上下文中的额外上下文
schema 也接受 `continue` 和 `user_message` 字段，但当前的
调用方不会强制执行它们。即使 `continue` 为 `false`，也不会阻止
会话创建。

#### sessionEnd

在 composer 会话结束时调用。此钩子为即发即忘类型，适合用于日志记录、分析或清理任务。响应会被记录但不会被使用。

```
// Input
{
  "session_id": "<unique session identifier>",
  "reason": "completed" | "aborted" | "error" | "window_close" | "user_close",
  "duration_ms": 45000,
  "is_background_agent": true | false,
  "final_status": "<status string>",
  "error_message": "<error details if reason is 'error'>"
}
```

```
// Output
{
  // No output fields - fire and forget
}
```

输入字段类型描述`session_id`string即将结束的会话的唯一标识符`reason`string会话的结束方式："completed"、"aborted"、"error"、"window_close" 或 "user_close"`duration_ms`number会话的总持续时间 (毫秒)`is_background_agent`boolean该会话是否为后台 agent 会话`final_status`string会话的最终状态`error_message`string (optional)当 reason 为 "error" 时的错误消息
#### preCompact

在上下文窗口进行压缩/汇总之前调用。这是一个仅用于观察的 hook，不能阻塞或修改压缩行为。可用于记录压缩发生的时间或通知用户。

```
// 输入
{
  "trigger": "auto" | "manual",
  "context_usage_percent": 85,
  "context_tokens": 120000,
  "context_window_size": 128000,
  "message_count": 45,
  "messages_to_compact": 30,
  "is_first_compaction": true | false
}
```

```
// 输出
{
  "user_message": "<message to show when compaction occurs>"
}
```

输入字段类型描述`trigger`string触发压缩的方式："auto" 或 "manual"`context_usage_percent`number当前上下文窗口的使用百分比 (0-100)`context_tokens`number当前上下文窗口中的 token 数`context_window_size`number最大上下文窗口大小 (按 token 计)`message_count`number会话中的消息数量`messages_to_compact`number将要被汇总的消息数量`is_first_compaction`boolean此会话是否为首次执行压缩
输出字段类型描述`user_message`string (optional)发生压缩时展示给用户的消息
## 环境变量

Hook 脚本在执行时会收到以下环境变量：

Variable描述Always Present`CURSOR_PROJECT_DIR`工作区根目录Yes`CURSOR_VERSION`Cursor 版本字符串Yes`CURSOR_USER_EMAIL`已认证用户的邮箱If logged in`CURSOR_TRANSCRIPT_PATH`对话转录文件的路径If transcripts enabled`CURSOR_CODE_REMOTE`在远程工作区中运行时设为字符串 `"true"`For remote workspaces`CLAUDE_PROJECT_DIR`项目目录别名 (用于 Claude 兼容性)Yes
由 `sessionStart` hook 设置的会话级环境变量会在该会话中的所有后续 hook 执行时传入。

## 疑难解答

**如何确认 hooks 已激活**

Cursor 设置中有一个 Hooks 选项卡，可用于调试已配置和已执行的 hooks，同时还有一个 Hooks 输出频道可用于查看错误。

**如果 hooks 无法正常工作**

- Cursor 会监视 `hooks.json` 文件，并在保存时重新加载它们。如果 hooks 仍然无法加载，请重启 Cursor。
- 检查相对于 hook 源的路径是否正确：
- 对于 **project hooks**，路径相对于 **项目根目录**（例如 `.cursor/hooks/script.sh`）
- 对于 **用户 hooks**，路径相对于 `~/.cursor/`（例如 `./hooks/script.sh` 或 `hooks/script.sh`）

**退出码拦截**

命令 hooks 返回退出码 `2` 时会阻止该操作（等同于返回 `permission: "deny"`）。这是为了兼容性而与 Claude Code 的行为保持一致。

Enterprise hooks and distribution

Cloud distribution and team-wide hook management are available on Enterprise.

[Contact Sales](https://cursor.com/contact-sales?source=docs-hooks)