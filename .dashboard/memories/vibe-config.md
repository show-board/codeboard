# VibeCoding 配置（必读）

## 基本配置

| 项目 | 值 |
|------|-----|
| 回复语言 | **中文**（所有交互必须使用中文） |
| 代码注释 | 中文注释，解释作用/方法/流程 |
| 操作系统 | macOS (darwin 25.4.0) |
| Shell | zsh |
| 工作目录 | /Users/likun/workspace/remote/codeboard |
| Node.js | >= 20.x |
| 包管理器 | pnpm |

## 开发规则

1. **必须使用中文回复**，包括代码注释
2. **必须生成可运行的代码**，不能有语法错误或缺少依赖
3. **必须有更新记录文档**，每次 Session 后更新 session-history.md
4. **必须有环境配置说明**，技术方案变更时更新 tech-details.md
5. **代码必须有注释**，文件头部说明 + 函数/方法 JSDoc
6. **不要添加多余的 emoji**，除非用户明确要求

## 项目约定

- API 端口：2585（默认）
- 看板地址：http://127.0.0.1:2585
- 项目 ID：proj_20260404235100
- Skills 安装位置：`~/.cursor/skills/codeboard/`（符号链接自仓库 `skills/codeboard/`，勿写入 `~/.cursor/skills-cursor/`）
- 数据目录：~/Library/Application Support/codeboard/data/

## 记忆管理约定

- 基础记忆（1-6）首次必须全部创建
- session-history.md 每次必须更新
- vibe-config.md 每次必须读取
- 运行记忆（7-9）按需更新
- 所有记忆更新后必须推送到看板

## 依赖管理

- 使用 pnpm 安装依赖
- 不要手动指定版本号，使用 `pnpm add <package>` 获取最新版
- native module（如 better-sqlite3）需要特别注意 ABI 兼容性
