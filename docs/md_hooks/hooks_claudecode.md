Hooks 参考

本页面提供在 Claude Code 中实现 hooks 的参考文档。

有关包含示例的快速入门指南，请参阅 [Claude Code hooks 入门](/zh-CN/docs/claude-code/hooks-guide)。
配置

Claude Code hooks 在您的设置文件中配置：

~/.claude/settings.json - 用户设置
.claude/settings.json - 项目设置
.claude/settings.local.json - 本地项目设置（不提交）
企业管理策略设置
结构

Hooks 按匹配器组织，每个匹配器可以有多个 hooks：

{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolPattern",
        "hooks": [
          {
            "type": "command",
            "command": "your-command-here"
          }
        ]
      }
    ]
  }
}
matcher：匹配工具名称的模式，区分大小写（仅适用于 PreToolUse 和 PostToolUse）
简单字符串精确匹配：Write 仅匹配 Write 工具
支持正则表达式：Edit|Write 或 Notebook.*
使用 * 匹配所有工具。您也可以使用空字符串（""）或留空 matcher。
hooks：当模式匹配时要执行的命令数组
type：目前仅支持 "command"
command：要执行的 bash 命令（可以使用 $CLAUDE_PROJECT_DIR 环境变量）
timeout：（可选）命令运行多长时间（以秒为单位）后 取消该特定命令。
对于像 UserPromptSubmit、Notification、Stop 和 SubagentStop 这样不使用匹配器的事件，您可以省略匹配器字段：

{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/prompt-validator.py"
          }
        ]
      }
    ]
  }
}
项目特定的 Hook 脚本

您可以使用环境变量 CLAUDE_PROJECT_DIR（仅在 Claude Code 生成 hook 命令时可用）来引用存储在项目中的脚本， 确保无论 Claude 的当前目录如何，它们都能正常工作：

{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/check-style.sh"
          }
        ]
      }
    ]
  }
}
Hook 事件

PreToolUse

在 Claude 创建工具参数之后、处理工具调用之前运行。

常见匹配器：

Task - 子代理任务（参见子代理文档）
Bash - Shell 命令
Glob - 文件模式匹配
Grep - 内容搜索
Read - 文件读取
Edit、MultiEdit - 文件编辑
Write - 文件写入
WebFetch、WebSearch - Web 操作
PostToolUse

在工具成功完成后立即运行。

识别与 PreToolUse 相同的匹配器值。

Notification

当 Claude Code 发送通知时运行。通知在以下情况下发送：

Claude 需要您的许可才能使用工具。示例："Claude needs your permission to use Bash"
提示输入已空闲至少 60 秒。"Claude is waiting for your input"
UserPromptSubmit

当用户提交提示时、Claude 处理之前运行。这允许您 根据提示/对话添加额外的上下文、验证提示或 阻止某些类型的提示。

Stop

当主 Claude Code 代理完成响应时运行。如果 停止是由于用户中断而发生的，则不会运行。

SubagentStop

当 Claude Code 子代理（Task 工具调用）完成响应时运行。

PreCompact

在 Claude Code 即将运行压缩操作之前运行。

匹配器：

manual - 从 /compact 调用
auto - 从自动压缩调用（由于上下文窗口已满）
SessionStart

当 Claude Code 启动新会话或恢复现有会话时运行（目前 确实在底层启动新会话）。对于加载 开发上下文（如现有问题或代码库的最近更改）很有用。

匹配器：

startup - 从启动调用
resume - 从 --resume、--continue 或 /resume 调用
clear - 从 /clear 调用
compact - 从自动或手动压缩调用。
SessionEnd

当 Claude Code 会话结束时运行。对于清理任务、记录会话 统计信息或保存会话状态很有用。

hook 输入中的 reason 字段将是以下之一：

clear - 使用 /clear 命令清除会话
logout - 用户注销
prompt_input_exit - 用户在提示输入可见时退出
other - 其他退出原因
Hook 输入

Hooks 通过 stdin 接收包含会话信息和 事件特定数据的 JSON 数据：

{
  // 通用字段
  session_id: string
  transcript_path: string  // 对话 JSON 的路径
  cwd: string              // 调用 hook 时的当前工作目录

  // 事件特定字段
  hook_event_name: string
  ...
}
PreToolUse 输入

tool_input 的确切模式取决于工具。

{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "PreToolUse",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file.txt",
    "content": "file content"
  }
}
PostToolUse 输入

tool_input 和 tool_response 的确切模式取决于工具。

{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "PostToolUse",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file.txt",
    "content": "file content"
  },
  "tool_response": {
    "filePath": "/path/to/file.txt",
    "success": true
  }
}
Notification 输入

{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "Notification",
  "message": "Task completed successfully"
}
UserPromptSubmit 输入

{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "UserPromptSubmit",
  "prompt": "Write a function to calculate the factorial of a number"
}
Stop 和 SubagentStop 输入

当 Claude Code 已经由于 停止 hook 而继续时，stop_hook_active 为 true。检查此值或处理记录以防止 Claude Code 无限运行。

{
  "session_id": "abc123",
  "transcript_path": "~/.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "hook_event_name": "Stop",
  "stop_hook_active": true
}
PreCompact 输入

对于 manual，custom_instructions 来自用户传递给 /compact 的内容。对于 auto，custom_instructions 为空。

{
  "session_id": "abc123",
  "transcript_path": "~/.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "hook_event_name": "PreCompact",
  "trigger": "manual",
  "custom_instructions": ""
}
SessionStart 输入

{
  "session_id": "abc123",
  "transcript_path": "~/.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "hook_event_name": "SessionStart",
  "source": "startup"
}
SessionEnd 输入

{
  "session_id": "abc123",
  "transcript_path": "~/.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "SessionEnd",
  "reason": "exit"
}
Hook 输出

有两种方式让 hooks 将输出返回给 Claude Code。输出 传达是否阻止以及应该向 Claude 和用户显示的任何反馈。

简单：退出代码

Hooks 通过退出代码、stdout 和 stderr 传达状态：

退出代码 0：成功。stdout 在记录模式 （CTRL-R）中向用户显示，除了 UserPromptSubmit 和 SessionStart，其中 stdout 被 添加到上下文中。
退出代码 2：阻塞错误。stderr 被反馈给 Claude 自动处理 。请参阅下面的每个 hook 事件行为。
其他退出代码：非阻塞错误。stderr 向用户显示， 执行继续。
提醒：如果退出代码为 0，Claude Code 不会看到 stdout，除了 `UserPromptSubmit` hook，其中 stdout 作为上下文注入。
退出代码 2 行为

Hook 事件	行为
PreToolUse	阻止工具调用，向 Claude 显示 stderr
PostToolUse	向 Claude 显示 stderr（工具已运行）
Notification	不适用，仅向用户显示 stderr
UserPromptSubmit	阻止提示处理，擦除提示，仅向用户显示 stderr
Stop	阻止停止，向 Claude 显示 stderr
SubagentStop	阻止停止，向 Claude 子代理显示 stderr
PreCompact	不适用，仅向用户显示 stderr
SessionStart	不适用，仅向用户显示 stderr
SessionEnd	不适用，仅向用户显示 stderr
高级：JSON 输出

Hooks 可以在 stdout 中返回结构化 JSON 以获得更复杂的控制：

通用 JSON 字段

所有 hook 类型都可以包含这些可选字段：

{
  "continue": true, // Claude 是否应该在 hook 执行后继续（默认：true）
  "stopReason": "string", // 当 continue 为 false 时显示的消息

  "suppressOutput": true, // 在记录模式中隐藏 stdout（默认：false）
  "systemMessage": "string" // 向用户显示的可选警告消息
}
如果 continue 为 false，Claude 在 hooks 运行后停止处理。

对于 PreToolUse，这与 "permissionDecision": "deny" 不同，后者 仅阻止特定工具调用并向 Claude 提供自动反馈。
对于 PostToolUse，这与 "decision": "block" 不同，后者 向 Claude 提供自动反馈。
对于 UserPromptSubmit，这防止提示被处理。
对于 Stop 和 SubagentStop，这优先于任何 "decision": "block" 输出。
在所有情况下，"continue" = false 优先于任何 "decision": "block" 输出。
stopReason 伴随 continue 提供向用户显示的原因，不向 Claude 显示。

PreToolUse 决策控制

PreToolUse hooks 可以控制工具调用是否继续。

"allow" 绕过权限系统。permissionDecisionReason 向 用户显示但不向 Claude 显示。
"deny" 防止工具调用执行。permissionDecisionReason 向 Claude 显示。
"ask" 要求用户在 UI 中确认工具调用。 permissionDecisionReason 向用户显示但不向 Claude 显示。
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow" | "deny" | "ask",
    "permissionDecisionReason": "My reason here"
  }
}
PreToolUse hooks 的 `decision` 和 `reason` 字段已弃用。 请使用 `hookSpecificOutput.permissionDecision` 和 `hookSpecificOutput.permissionDecisionReason`。弃用的字段 `"approve"` 和 `"block"` 分别映射到 `"allow"` 和 `"deny"`。
PostToolUse 决策控制

PostToolUse hooks 可以在工具执行后向 Claude 提供反馈。

"block" 自动用 reason 提示 Claude。
undefined 什么都不做。reason 被忽略。
"hookSpecificOutput.additionalContext" 为 Claude 添加要考虑的上下文。
{
  "decision": "block" | undefined,
  "reason": "Explanation for decision",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Additional information for Claude"
  }
}
UserPromptSubmit 决策控制

UserPromptSubmit hooks 可以控制是否处理用户提示。

"block" 防止提示被处理。提交的提示从 上下文中擦除。"reason" 向用户显示但不添加到上下文中。
undefined 允许提示正常进行。"reason" 被忽略。
"hookSpecificOutput.additionalContext" 如果未被阻止，将字符串添加到上下文中。
{
  "decision": "block" | undefined,
  "reason": "Explanation for decision",
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "My additional context here"
  }
}
Stop/SubagentStop 决策控制

Stop 和 SubagentStop hooks 可以控制 Claude 是否必须继续。

"block" 防止 Claude 停止。您必须填充 reason 以便 Claude 知道如何继续。
undefined 允许 Claude 停止。reason 被忽略。
{
  "decision": "block" | undefined,
  "reason": "Must be provided when Claude is blocked from stopping"
}
SessionStart 决策控制

SessionStart hooks 允许您在会话开始时加载上下文。

"hookSpecificOutput.additionalContext" 将字符串添加到上下文中。
多个 hooks 的 additionalContext 值被连接。
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "My additional context here"
  }
}
SessionEnd 决策控制

SessionEnd hooks 在会话结束时运行。它们无法阻止会话终止 但可以执行清理任务。

退出代码示例：Bash 命令验证

#!/usr/bin/env python3
import json
import re
import sys

# 将验证规则定义为（正则表达式模式，消息）元组列表
VALIDATION_RULES = [
    (
        r"\bgrep\b(?!.*\|)",
        "Use 'rg' (ripgrep) instead of 'grep' for better performance and features",
    ),
    (
        r"\bfind\s+\S+\s+-name\b",
        "Use 'rg --files | rg pattern' or 'rg --files -g pattern' instead of 'find -name' for better performance",
    ),
]


def validate_command(command: str) -> list[str]:
    issues = []
    for pattern, message in VALIDATION_RULES:
        if re.search(pattern, command):
            issues.append(message)
    return issues


try:
    input_data = json.load(sys.stdin)
except json.JSONDecodeError as e:
    print(f"Error: Invalid JSON input: {e}", file=sys.stderr)
    sys.exit(1)

tool_name = input_data.get("tool_name", "")
tool_input = input_data.get("tool_input", {})
command = tool_input.get("command", "")

if tool_name != "Bash" or not command:
    sys.exit(1)

# 验证命令
issues = validate_command(command)

if issues:
    for message in issues:
        print(f"• {message}", file=sys.stderr)
    # 退出代码 2 阻止工具调用并向 Claude 显示 stderr
    sys.exit(2)
JSON 输出示例：UserPromptSubmit 添加上下文和验证

对于 `UserPromptSubmit` hooks，您可以使用任一方法注入上下文：
退出代码 0 与 stdout：Claude 看到上下文（UserPromptSubmit 的特殊情况）
JSON 输出：提供对行为的更多控制
#!/usr/bin/env python3
import json
import sys
import re
import datetime

# 从 stdin 加载输入
try:
    input_data = json.load(sys.stdin)
except json.JSONDecodeError as e:
    print(f"Error: Invalid JSON input: {e}", file=sys.stderr)
    sys.exit(1)

prompt = input_data.get("prompt", "")

# 检查敏感模式
sensitive_patterns = [
    (r"(?i)\b(password|secret|key|token)\s*[:=]", "Prompt contains potential secrets"),
]

for pattern, message in sensitive_patterns:
    if re.search(pattern, prompt):
        # 使用 JSON 输出以特定原因阻止
        output = {
            "decision": "block",
            "reason": f"Security policy violation: {message}. Please rephrase your request without sensitive information."
        }
        print(json.dumps(output))
        sys.exit(0)

# 将当前时间添加到上下文
context = f"Current time: {datetime.datetime.now()}"
print(context)

"""
以下也是等效的：
print(json.dumps({
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": context,
  },
}))
"""

# 允许提示继续进行，并添加额外上下文
sys.exit(0)
JSON 输出示例：PreToolUse 与批准

#!/usr/bin/env python3
import json
import sys

# 从 stdin 加载输入
try:
    input_data = json.load(sys.stdin)
except json.JSONDecodeError as e:
    print(f"Error: Invalid JSON input: {e}", file=sys.stderr)
    sys.exit(1)

tool_name = input_data.get("tool_name", "")
tool_input = input_data.get("tool_input", {})

# 示例：自动批准文档文件的文件读取
if tool_name == "Read":
    file_path = tool_input.get("file_path", "")
    if file_path.endswith((".md", ".mdx", ".txt", ".json")):
        # 使用 JSON 输出自动批准工具调用
        output = {
            "decision": "approve",
            "reason": "Documentation file auto-approved",
            "suppressOutput": True  # 不在记录模式中显示
        }
        print(json.dumps(output))
        sys.exit(0)

# 对于其他情况，让正常的权限流程继续
sys.exit(0)
使用 MCP 工具

Claude Code hooks 与 模型上下文协议（MCP）工具无缝协作。当 MCP 服务器 提供工具时，它们以您可以在 hooks 中匹配的特殊命名模式出现。

MCP 工具命名

MCP 工具遵循模式 mcp__<server>__<tool>，例如：

mcp__memory__create_entities - Memory 服务器的创建实体工具
mcp__filesystem__read_file - Filesystem 服务器的读取文件工具
mcp__github__search_repositories - GitHub 服务器的搜索工具
为 MCP 工具配置 Hooks

您可以针对特定的 MCP 工具或整个 MCP 服务器：

{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__memory__.*",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Memory operation initiated' >> ~/mcp-operations.log"
          }
        ]
      },
      {
        "matcher": "mcp__.*__write.*",
        "hooks": [
          {
            "type": "command",
            "command": "/home/user/scripts/validate-mcp-write.py"
          }
        ]
      }
    ]
  }
}
示例

有关包括代码格式化、通知和文件保护在内的实际示例，请参阅入门指南中的[更多示例](/zh-CN/docs/claude-code/hooks-guide#more-examples)。
安全注意事项

免责声明

使用风险自负：Claude Code hooks 在 您的系统上自动执行任意 shell 命令。通过使用 hooks，您承认：

您对配置的命令负全部责任
Hooks 可以修改、删除或访问您的用户帐户可以访问的任何文件
恶意或编写不当的 hooks 可能导致数据丢失或系统损坏
Anthropic 不提供保证，对因使用 hook 而导致的任何损害 不承担任何责任
您应该在生产使用之前在安全环境中彻底测试 hooks
在将任何 hook 命令添加到您的 配置之前，请始终审查和理解它们。

安全最佳实践

以下是编写更安全 hooks 的一些关键实践：

验证和清理输入 - 永远不要盲目信任输入数据
始终引用 shell 变量 - 使用 "$VAR" 而不是 $VAR
阻止路径遍历 - 检查文件路径中的 ..
使用绝对路径 - 为脚本指定完整路径（使用 $CLAUDE_PROJECT_DIR 作为项目路径）
跳过敏感文件 - 避免 .env、.git/、密钥等。
配置安全

对设置文件中 hooks 的直接编辑不会立即生效。Claude Code：

在启动时捕获 hooks 的快照
在整个会话中使用此快照
如果 hooks 被外部修改则发出警告
需要在 /hooks 菜单中审查更改才能应用
这防止恶意 hook 修改影响您当前的会话。

Hook 执行详情

超时：默认 60 秒执行限制，每个命令可配置。
单个命令的超时不会影响其他命令。
并行化：所有匹配的 hooks 并行运行
去重：多个相同的 hook 命令自动去重
环境：在当前目录中运行，使用 Claude Code 的环境
CLAUDE_PROJECT_DIR 环境变量可用，包含 项目根目录的绝对路径（Claude Code 启动的地方）
输入：通过 stdin 的 JSON
输出：
PreToolUse/PostToolUse/Stop/SubagentStop：在记录中显示进度（Ctrl-R）
Notification/SessionEnd：仅记录到调试（--debug）
UserPromptSubmit/SessionStart：stdout 作为 Claude 的上下文添加
调试

基本故障排除

如果您的 hooks 不工作：

检查配置 - 运行 /hooks 查看您的 hook 是否已注册
验证语法 - 确保您的 JSON 设置有效
测试命令 - 首先手动运行 hook 命令
检查权限 - 确保脚本可执行
查看日志 - 使用 claude --debug 查看 hook 执行详情
常见问题：

引号未转义 - 在 JSON 字符串内使用 \"
错误的匹配器 - 检查工具名称完全匹配（区分大小写）
找不到命令 - 为脚本使用完整路径
高级调试

对于复杂的 hook 问题：

检查 hook 执行 - 使用 claude --debug 查看详细的 hook 执行
验证 JSON 模式 - 使用外部工具测试 hook 输入/输出
检查环境变量 - 验证 Claude Code 的环境是否正确
测试边缘情况 - 尝试使用异常文件路径或输入的 hooks
监控系统资源 - 检查 hook 执行期间的资源耗尽
使用结构化日志记录 - 在您的 hook 脚本中实现日志记录
调试输出示例

使用 claude --debug 查看 hook 执行详情：

[DEBUG] Executing hooks for PostToolUse:Write
[DEBUG] Getting matching hook commands for PostToolUse with query: Write
[DEBUG] Found 1 hook matchers in settings
[DEBUG] Matched 1 hooks for query "Write"
[DEBUG] Found 1 hook commands to execute
[DEBUG] Executing hook command: <Your command> with timeout 60000ms
[DEBUG] Hook command completed with status 0: <Your stdout>
进度消息出现在记录模式（Ctrl-R）中，显示：

哪个 hook 正在运行
正在执行的命令
成功/失败状态
输出或错误消息