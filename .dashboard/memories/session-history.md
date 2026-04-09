# Session 历史记录

## 2026-04-10

### sess_1775755042 — hooks 全分类面板扩展与 mac 风格重构
- **目标**: 全屏右侧不再只显示 4 类统计，改为覆盖所有可传输 hooks 分类，并保持优雅布局不挤压明细区。
- **完成任务**:
  - [x] 右侧面板改为动态分类渲染，展示 `mcp/tool_call/file_write/file_read/shell/session/subagent/compact/message/prompt/other`
  - [x] 新增 prompt 相关统计：`beforeSubmitPrompt` / `UserPromptSubmit` 归入 `prompt` 分类
  - [x] 面板重构为“概览卡 + 分类胶囊 + 高频 Hook 标签 + 明细列表”四段式布局
  - [x] 明细增强：增加结构化标签（duration/reason/failure/context 等）与 payload JSON 折叠查看
  - [x] 同步 `standalone` 与 `db` 两套分类/统计逻辑，避免不同运行模式统计不一致
- **关键变更文件**: `src/components/Board/ExpandedHooksPanel.tsx`, `electron/main/db/index.ts`, `electron/main/server/standalone.ts`, `docs/HOOKS-EVENT-MAPPING.md`

### sess_1775753348 — 取消 ToolUse 到 task 映射，恢复 task 语义上报
- **目标**: 将 `task` 与 `toolcall` 完全解耦，确保任务状态仅由 Agent 规划语义驱动。
- **完成任务**:
  - [x] 移除 Cursor/Claude/OpenClaw hooks 脚本中的 `task_start/task_complete/session_complete` 自动映射
  - [x] 保留 hooks 独立轨迹上报：`/api/hooks/events`
  - [x] 仅保留会话创建类自动上报：`session_start`
  - [x] 更新三套 skills：明确 `task_start/task_complete/session_complete` 必须手动发送
  - [x] 更新技术文档与映射文档，说明官方无 task hooks 且当前采用手动语义上报
- **关键变更文件**: `docs/hooks_templates/*`, `skills/codeboard-*/SKILL.md`, `docs/HOOKS-TECHNICAL-GUIDE.md`, `docs/HOOKS-EVENT-MAPPING.md`

### sess_1775752861 — 总控安装脚本与 task 映射机制说明
- **目标**: 新增一键总控安装脚本 `install-hooks-all.sh`，并明确回答“官方无 task hooks 时如何判定 task 完成时间与总结来源”。
- **完成任务**:
  - [x] 新增 `scripts/install-hooks-all.sh`，自动检测 Cursor/Claude/OpenClaw 并差异化安装
  - [x] hooks 脚本增强：Cursor/Claude 的 task summary 优先提取 `tool_output/tool_response/error_message`
  - [x] OpenClaw `command:stop` 的 session 总结增加 reason 字段
  - [x] 新增技术说明 `docs/HOOKS-TECHNICAL-GUIDE.md` 的 “3.1~3.3” 章节，明确这属于映射策略而非官方原生 task 事件
  - [x] 三份 Agent 安装文档与 install skill 接入总控脚本说明
- **关键变更文件**: `scripts/install-hooks-all.sh`, `docs/HOOKS-TECHNICAL-GUIDE.md`, `docs/hooks_templates/*`, `docs/AGENT-SETUP-*.md`, `skills/install-codeboard-skills/SKILL.md`

### sess_1775752066 — hooks 覆盖补强、技术文档与一键安装脚本
- **目标**: 确认并优化 hooks 覆盖，确保 `task_list`、`task_start`、`task_complete`、`session_complete` 均有稳定发送路径；补齐完整技术文档与一键安装能力。
- **完成任务**:
  - [x] 增强三套 hooks 脚本：Cursor/Claude/OpenClaw 自动补发 `session_start(task_list粗拆)`、`task_start/task_complete`、`session_complete`
  - [x] 在三套 hooks-first skills 中增加“覆盖边界 + 手动回退命令”指导，避免功能失效
  - [x] 新增技术文档 `docs/HOOKS-TECHNICAL-GUIDE.md`（全流程、覆盖矩阵、命令示例、排障）
  - [x] 新增一键安装脚本：`scripts/install-hooks-cursor.sh`、`scripts/install-hooks-claudecode.sh`、`scripts/install-hooks-openclaw.sh`
  - [x] 安装文档升级：三份 `AGENT-SETUP-*` 与 `install-codeboard-skills` 接入一键脚本
- **关键变更文件**: `docs/hooks_templates/*`, `skills/codeboard-*/SKILL.md`, `docs/HOOKS-TECHNICAL-GUIDE.md`, `scripts/install-hooks-*.sh`, `docs/AGENT-SETUP-*.md`

### sess_1775750585 — 多 Agent hooks-first 改造与会话统计面板
- **目标**: 基于 Cursor / Claude Code / OpenClaw 的官方 hooks 机制，减少手工 curl 依赖，同时保留无 hooks skill 回退路径；全屏模式改为 Session hooks 统计视图。
- **完成任务**:
  - [x] 新增 3 套 hooks-first skills：`skills/codeboard-cursor`、`skills/codeboard-claudecode`、`skills/codeboard-openclaw`
  - [x] 保留无 hooks 回退：`skills/codeboard`
  - [x] 新增多 Agent hooks 模板：`docs/hooks_templates/{cursor,claudecode,openclaw}`
  - [x] 新增 hooks 统一映射文档：`docs/HOOKS-EVENT-MAPPING.md`
  - [x] 后端新增 hooks 事件链路：`hook_events` 表 + `/api/hooks/events` + `/api/hooks/sessions/:sessionId`
  - [x] 全屏右侧改为 hooks 统计面板：支持 MCP / ToolCall / 文件写入点击筛选与明细浏览
  - [x] 更新 Cursor/Claude/OpenClaw 安装文档与 README/API 索引
- **关键变更文件**: `electron/main/db/*`, `electron/main/server/routes/hooks.ts`, `electron/main/server/index.ts`, `electron/main/server/standalone.ts`, `src/components/Board/*`, `src/components/SessionCard/index.tsx`, `docs/AGENT-SETUP-*.md`, `docs/hooks_templates/*`

## 2026-04-07

### sess_fix_dmg_20260407 — 修复 DMG 分发后「生成 Skills」为空
- **目标**: 分享打包的 `.dmg` 后，对方应用内魔法棒/Skills 生成器无文件
- **根因**:
  1. `electron-builder` 未打入 `skills/codeboard/`，主进程只在 `app.getAppPath()/skills/codeboard` 查找，安装包内不存在该路径
  2. 回退逻辑请求 `GET /api/skills/generate`，但 **standalone 子进程**（生产环境实际 API）此前未注册该路由（仅 `server/index.ts` 内有），`fetch` 得到 404，文件列表为空
- **处理**:
  - `package.json` 增加 `extraResources`，将 `skills/codeboard` 复制到 `Contents/Resources/skills/codeboard`
  - `electron/main/index.ts` 增加 `resolveSkillsCodeboardDir()`（打包后用 `process.resourcesPath`），磁盘仍无内容时用 API，再用 `generateSkillsTemplate` 本地兜底
  - `standalone.ts` 注册 `GET /api/skills/generate`，与内嵌 Express 行为一致
- **关键变更文件**: `package.json`, `electron/main/index.ts`, `electron/main/server/standalone.ts`

### sess_20260407_fix_sqlite — 修复 API 子进程因 better-sqlite3 架构错误无法监听 2585
- **目标**: 定位「端口 2585 起不来 / 进程代码 1」根因，修复后在 2585 验证 API
- **根因**: `better_sqlite3.node` 为 x86_64，本机 Node 为 arm64，`dlopen` 失败导致 standalone 在绑定端口前即退出
- **处理**: 执行 `pnpm rebuild better-sqlite3`，原生模块变为 arm64
- **验证**: `CB_PORT=2585 node out/main/server/standalone.js` 启动成功；`curl http://127.0.0.1:2585/api/health` 返回 `success: true`

## 2026-04-05

### sess_20260405_220100 — 看板 UI 九项优化（信息展示+交互增强+功能新增+Bug修复）
- **目标**: 卡片信息展示、弹窗通知修复、展开布局优化、运行状态引导、排序功能增强、设置功能新增、Session删除修复
- **完成任务**:
  - [x] 设置功能 — settingsStore 新增 DisplayConfig（卡片高度/运行状态/侧栏显隐），localStorage 持久化；Settings 弹窗组件（齿轮图标，Portal 渲染）
  - [x] Sidebar 更新 — 帮助按钮左侧新增齿轮设置按钮；ServerConfig/ApiDetail 根据配置条件渲染
  - [x] 卡片信息展示 — 默认完整展示目标和总结（不限行数），可在设置中切换为固定高度省略模式；任务列表 full 模式展示全部
  - [x] TaskDetail 弹窗 — session_complete 节点始终展示 Session 总结（移除原先的条件判断限制）
  - [x] 弹窗通知修复 — 重写 NotificationDetail：分离数据加载与已读标记避免时序冲突；添加 store 通知回退；关闭时才标记已读；未读高亮样式
  - [x] 展开显示优化 — 标题栏全宽置顶（headerOnly 模式），下方卡片和记忆面板 50/50 平分（bodyOnly 模式）
  - [x] 运行状态引导 — 运行中项目颜色圆点 CSS 闪烁动画（status-blink），全部完成绿色呼吸环（status-complete-ring），可在设置中开关
  - [x] 排序功能 — 项目排序支持正序/倒序（sortOrder），卡片排序支持最新在前/最早在前（cardSortOrder）；SortDropdown 分组显示
  - [x] 修复 Session 卡片右键删除 — 右键菜单通过 createPortal 渲染到 body 层（z-9999），阻止事件冒泡（onClick/onMouseDown stopPropagation）
- **关键变更文件**: settingsStore.ts, uiStore.ts, Settings.tsx(新), Sidebar/index.tsx, SessionCard/index.tsx, Board/index.tsx, Board/ProjectColumn.tsx, Modals/TaskDetail.tsx, Modals/NotificationDetail.tsx, Toolbar/SortDropdown.tsx, App.tsx, globals.css

### sess_20260405_180001 — UI五项优化（交互增强+功能扩展）
- **目标**: 五项UI优化：Skill模板生成器修复、展示区滚动、项目放大缩小、卡片右键删除、垃圾篓分类清空
- **完成任务**:
  - [x] 展示区滚动修复 — Board高度链修正(flex-1→h-full)；阻止拖拽事件冒泡干扰列纵向滚动；添加列hover渐显滚动条CSS
  - [x] Skills模板生成器重写 — IPC读取仓库skills/codeboard/完整目录(SKILL.md+references/)；前端文件树浏览+内容切换；保存为codeboard/目录结构
  - [x] 项目放大缩小 — macOS三色按钮(黄隐藏/绿放大/红删除)；放大后左右分屏(50%卡片+50%记忆面板)；ExpandedMemoryPanel组件；framer-motion动画过渡
  - [x] 卡片右键删除 — DB sessions表添加is_trashed列；6个API端点(trash/restore/permanent/clear/trashed)；右键上下文菜单(查看详情/删除卡片)
  - [x] 垃圾篓分类清空 — 项目/Session双标签页切换；清空下拉菜单(全部/仅项目/仅Session)；standalone服务器同步添加session垃圾篓端点
- **关键变更文件**: Board/index.tsx, Board/ProjectColumn.tsx, Board/ExpandedMemoryPanel.tsx(新), SessionCard/index.tsx, SkillsGenerator.tsx, TrashBin.tsx, uiStore.ts, projectStore.ts, globals.css, electron/main/index.ts, electron/preload/index.ts, electron.d.ts, db/index.ts, sessions.ts(routes), standalone.ts

### sess_20260405_140001 — UI五项优化（信息展示增强+Bug修复）
- **目标**: 优化CodeBoard五个方面：卡片详情信息展示、消息弹窗时间线、API详情宽度、记忆管理Markdown预览、帮助按钮修复
- **完成任务**:
  - [x] TaskDetail弹窗增强 — 展示Session目标、完整任务列表、每步更新详情（含规划/总结标签）、Session完成总结；后端改为在task_update中保存goal和task_list
  - [x] 消息弹窗时间线 — 新增NotificationDetail弹窗，单击色块显示项目消息的完整时间线（按日期分组、精确时间戳），双击跳转到项目列
  - [x] API详情宽度修复 — 根本原因是Sidebar的backdrop-blur创建新定位上下文，通过createPortal渲染到body解决；优化为两行布局+表格式字段说明
  - [x] 记忆管理Markdown预览 — 安装react-markdown+remark-gfm，增加预览/源码切换，默认Markdown渲染支持GFM
  - [x] 帮助按钮修复 — CSS类名拼写错误(titlebar-nodrag→titlebar-no-drag)导致按钮在窗口拖拽区域无法点击
- **关键变更文件**: TaskDetail.tsx, NotificationDetail.tsx, MemoryManager.tsx, ApiDetail.tsx, MessageBar/index.tsx, Sidebar/index.tsx, projectStore.ts, uiStore.ts, tasks.ts(routes), db/index.ts, electron/main/index.ts, preload/index.ts, App.tsx, electron.d.ts

### sess_docs_1743851000 — 文档与 Skills 导出模板对齐安装路径
- **目标**: 更新 `docs/*` 中 Cursor Rules/Skills 安装说明；修正 `generateSkillsTemplate` 流程与 `SKILL.md` 命名；应用内帮助与 README 目录索引一致。
- **完成任务**:
  - [x] 重写 AGENT-SETUP-CURSOR / INSTALL / CLAUDE / OPENCLEW / API / ARCHITECTURE
  - [x] 新增 `electron/main/server/skillsTemplate.ts`，`index.ts` 引用；保存对话框默认 `SKILL.md`
  - [x] HelpGuide、`.cursor/rules/codeboard.md`、`vibe-config` 中 Skills 路径统一为 `~/.cursor/skills/`
- **关键变更文件**: `docs/*`, `skillsTemplate.ts`, `electron/main/server/index.ts`, `electron/main/index.ts`, `HelpGuide.tsx`, `README.md`

### sess_1743849600 — Cursor CodeBoard Skills 安装与发现
- **目标**: 在仓库 `skills/` 下提供可复用的安装 Skill，确保 `codeboard` 看板对接 Skill 通过 `~/.cursor/skills` 被 Cursor 发现；主 Skill 补充 YAML frontmatter。
- **完成任务**:
  - [x] 新增 `skills/install-codeboard-skills/SKILL.md`（符号链接安装步骤、排错、可选项目内链接）
  - [x] `skills/codeboard/SKILL.md` 增加 `name` / `description` 元数据，便于 Agent 发现
  - [x] 本机执行 `ln -sfn` 将上述两目录链接到 `~/.cursor/skills/`
- **关键变更文件**: `skills/install-codeboard-skills/SKILL.md`, `skills/codeboard/SKILL.md`

### sess_20260405 — 看板v2优化（第三轮）
- **目标**: Skills 流程优先级修正、Cursor 自动执行配置、历史卡片折叠
- **完成任务**:
  - [x] Skills 流程重排：session_start 改为 Step 2（紧接项目确认后立即发送），在读取记忆和规划之前
  - [x] 新增 .cursor/rules/codeboard.md（alwaysApply: true）确保 Cursor 每次对话自动执行 CodeBoard 流程
  - [x] 重写 Cursor 安装指南 — Rules + Skills 双层保障方案
  - [x] SessionCard 新增折叠模式：有 running Session 时历史完成卡片自动折叠为单行
  - [x] 折叠卡片支持手动展开/折叠切换
  - [x] 同步更新 03-task-report.md / 06-conventions.md / 全局 Skills
- **关键变更文件**: SKILL.md, 03-task-report.md, 06-conventions.md, .cursor/rules/codeboard.md, AGENT-SETUP-CURSOR.md, SessionCard/index.tsx, ProjectColumn.tsx

## 2026-04-04

### sess_20260404235100 — 看板v2优化（第一轮）
- **目标**: 实现头像裁剪、API全屏弹窗、Skills模板生成器、Skills安装与初始化、开发要点报告
- **完成任务**:
  - [x] 头像功能 - 本地图片选择 + 1:1 裁剪（AvatarCropper 组件）
  - [x] API 详情弹窗改为全屏模式（90vw x 85vh）
  - [x] Skills 模板生成功能（/api/skills/generate 端点 + SkillsGenerator 弹窗）
  - [x] 将 Skills 安装到 Cursor 全局目录 ~/.cursor/skills-cursor/codeboard/
  - [x] 为 CodeBoard 项目创建 .dashboard/project.yaml 并注册看板
  - [x] Plan 文件完成度检查与开发要点报告
- **关键变更文件**: UserProfile.tsx, ApiDetail.tsx, SkillsGenerator.tsx, ServerConfig.tsx, settingsStore.ts, uiStore.ts, electron/main/index.ts, electron/preload/index.ts, electron/main/server/index.ts

### sess_20260404 — 看板v2优化（第二轮）
- **目标**: 帮助指南、Session总结显示增强、Skills记忆强制收录、记忆初始化上传
- **完成任务**:
  - [x] 左上角帮助按钮（?圆圈）+ HelpGuide 全屏弹窗（6个页签）
  - [x] Session 完成总结在卡片底部醒目显示（绿色"总结"标签）
  - [x] 后端 session_complete 支持 task_summary 回退逻辑
  - [x] Skills 模板全面更新（强制记忆收录流程、summary 必填、记忆分类定义）
  - [x] 全部 9 类记忆文档创建并上传到看板
- **关键变更文件**: Sidebar/index.tsx, HelpGuide.tsx, SessionCard/index.tsx, tasks.ts, SKILL.md, 04-session-complete.md, 06-conventions.md

## 2026-04-04（初始构建）

### 初始化阶段 — 全栈项目搭建
- **目标**: 从零构建 CodeBoard 看板全栈应用
- **完成功能**: 项目骨架、SQLite数据库、Express API、Electron主进程、React UI（Sidebar/Toolbar/MessageBar/Board/SessionCard/Modals）、记忆管理、推荐系统、CLI工具、SKILL.md、动画打磨、测试、打包配置
- **技术选型**: Electron 33 + React 18 + TypeScript + Tailwind + Framer Motion + Zustand + Express + Socket.IO + SQLite
