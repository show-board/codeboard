# Session 历史记录

## 2026-04-07

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
