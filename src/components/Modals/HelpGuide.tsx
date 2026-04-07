// ============================================================
// 帮助指南弹窗
// 向用户展示 CodeBoard 使用方法、不同 Agent 的 Skills 安装指南、
// 消息色块含义等帮助信息
// ============================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BookOpen, Terminal, Palette, MessageSquare, Puzzle } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import GlassCard from '../common/GlassCard'
import BlurOverlay from '../common/BlurOverlay'

/** 帮助页签定义 */
const TABS = [
  { id: 'overview', label: '概览', icon: BookOpen },
  { id: 'cursor', label: 'Cursor', icon: Terminal },
  { id: 'claude', label: 'Claude Code', icon: Terminal },
  { id: 'openclaw', label: 'OpenClaw', icon: Puzzle },
  { id: 'ui', label: '界面说明', icon: Palette },
  { id: 'messages', label: '消息提示', icon: MessageSquare }
] as const

type TabId = (typeof TABS)[number]['id']

export default function HelpGuide() {
  const { showHelpGuide, setShowHelpGuide } = useUIStore()
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  if (!showHelpGuide) return null

  return (
    <AnimatePresence>
      {showHelpGuide && (
        <>
          <BlurOverlay onClick={() => setShowHelpGuide(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
            <GlassCard
              modal
              className="w-[90vw] max-w-4xl h-[85vh] overflow-hidden flex flex-col pointer-events-auto"
            >
              {/* 头部 */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200/50 dark:border-gray-700/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">CodeBoard 使用指南</h2>
                    <p className="text-xs text-gray-500 mt-0.5">了解如何安装 Skills、使用看板和理解界面元素</p>
                  </div>
                </div>
                <button
                  className="p-2 rounded-xl hover:bg-gray-200/50 dark:hover:bg-gray-600/50 transition-colors"
                  onClick={() => setShowHelpGuide(false)}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* 页签导航 + 内容 */}
              <div className="flex flex-1 overflow-hidden">
                {/* 左侧页签栏 */}
                <nav className="w-44 shrink-0 border-r border-gray-200/50 dark:border-gray-700/50 py-3 px-2 space-y-1 overflow-y-auto">
                  {TABS.map(tab => {
                    const Icon = tab.icon
                    const active = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                          active
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                        }`}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    )
                  })}
                </nav>

                {/* 右侧内容区 */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                  <TabContent tabId={activeTab} />
                </div>
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

/** 根据页签 ID 渲染对应内容 */
function TabContent({ tabId }: { tabId: TabId }) {
  switch (tabId) {
    case 'overview':
      return <OverviewContent />
    case 'cursor':
      return <CursorContent />
    case 'claude':
      return <ClaudeContent />
    case 'openclaw':
      return <OpenClawContent />
    case 'ui':
      return <UIContent />
    case 'messages':
      return <MessagesContent />
    default:
      return null
  }
}

// ---- 各页签具体内容 ----

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">{children}</h3>
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">{children}</p>
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="text-xs bg-gray-100 dark:bg-gray-800 rounded-xl p-4 font-mono text-gray-700 dark:text-gray-300 overflow-x-auto mb-4 whitespace-pre-wrap">
      {children}
    </pre>
  )
}

function OverviewContent() {
  return (
    <div>
      <SectionTitle>什么是 CodeBoard？</SectionTitle>
      <Paragraph>
        CodeBoard 是一个 VibeCoding 多项目看板桌面应用，帮助你管理多个 AI Agent 项目的任务状态、
        Session 进度和项目记忆。Agent 通过 HTTP API 推送状态更新，看板实时显示。
      </Paragraph>

      <SectionTitle>核心工作流</SectionTitle>
      <div className="space-y-2 mb-4">
        {[
          '1. 安装 Skills — 让 Agent 了解对接流程',
          '2. 项目注册 — Agent 首次运行时自动注册到看板',
          '3. 任务上报 — Agent 执行任务时实时推送 session_start → task_start → task_complete → session_complete',
          '4. 记忆管理 — Agent 在 Session 完成后更新项目记忆并推送到看板',
          '5. 看板查看 — 在桌面应用中查看所有项目的实时进展'
        ].map(step => (
          <div key={step} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
            {step}
          </div>
        ))}
      </div>

      <SectionTitle>快速开始</SectionTitle>
      <Paragraph>
        左侧面板的服务地址旁有一个紫色魔法棒按钮，点击可生成 Skills 模板。
        将生成的 Skills 文件保存到你的项目目录中即可开始使用。
      </Paragraph>
    </div>
  )
}

function CursorContent() {
  return (
    <div>
      <SectionTitle>在 Cursor 中安装 CodeBoard Skills</SectionTitle>
      <Paragraph>
        Cursor 从 <code className="text-violet-600 dark:text-violet-400">~/.cursor/skills/&lt;目录名&gt;/SKILL.md</code>{' '}
        加载技能；勿向 <code className="text-violet-600 dark:text-violet-400">~/.cursor/skills-cursor/</code> 写入自定义内容。
        完整图文见仓库 <code className="text-violet-600 dark:text-violet-400">docs/AGENT-SETUP-CURSOR.md</code>。
      </Paragraph>

      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">方式一：符号链接（推荐，含 references）</h4>
      <CodeBlock>{`mkdir -p ~/.cursor/skills
REPO="/绝对路径/到/codeboard仓库"
ln -sfn "$REPO/skills/codeboard" ~/.cursor/skills/codeboard
ln -sfn "$REPO/skills/install-codeboard-skills" ~/.cursor/skills/install-codeboard-skills`}</CodeBlock>

      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">方式二：项目内链接</h4>
      <CodeBlock>{`mkdir -p .cursor/skills
REPO="/绝对路径/到/codeboard仓库"
ln -sfn "$REPO/skills/codeboard" .cursor/skills/codeboard`}</CodeBlock>

      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">方式三：魔法棒生成单文件</h4>
      <Paragraph>
        点击服务地址旁的魔法棒，生成带当前 Host:Port 的模板；请保存为{' '}
        <code className="text-violet-600 dark:text-violet-400">~/.cursor/skills/codeboard/SKILL.md</code>（需先创建目录）。
        单文件不含 <code className="text-violet-600 dark:text-violet-400">references/</code>，复杂流程以仓库{' '}
        <code className="text-violet-600 dark:text-violet-400">skills/codeboard/</code> 为准。
      </Paragraph>

      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Rules（必配）</h4>
      <Paragraph>
        将本仓库 <code className="text-violet-600 dark:text-violet-400">.cursor/rules/codeboard.md</code> 复制到业务项目的{' '}
        <code className="text-violet-600 dark:text-violet-400">.cursor/rules/</code>，并设{' '}
        <code className="text-violet-600 dark:text-violet-400">alwaysApply: true</code>，确保每次对话先执行 session_start。
      </Paragraph>

      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">验证</h4>
      <Paragraph>
        在 Cursor 设置中启用 Skills；新建 Agent 对话后应最先出现 session_start 的 curl，再看板出现新 Session。
      </Paragraph>
    </div>
  )
}

function ClaudeContent() {
  return (
    <div>
      <SectionTitle>在 Claude Code 中安装 CodeBoard Skills</SectionTitle>

      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">方式一：CLAUDE.md 项目配置（推荐）</h4>
      <Paragraph>在项目根目录创建 CLAUDE.md 文件，写入看板对接流程和 API 地址。</Paragraph>
      <CodeBlock>{`# 在项目目录创建（顺序勿改）
cat > CLAUDE.md << 'EOF'
# CodeBoard 看板对接
看板: http://127.0.0.1:2585
1. 读 .dashboard/project.yaml
2. 立即 session_start（可先 task_list:[]）
3. 再读记忆（必读 vibe-config）
4. 规划后同 session_id 再发 session_start 带完整 task_list
5. 每任务 task_start → task_complete
6. session_complete（summary 必填）+ 记忆 sync（files 为数组）
EOF`}</CodeBlock>

      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">方式二：配置 API 权限</h4>
      <CodeBlock>{`mkdir -p .claude
cat > .claude/settings.json << 'EOF'
{
  "permissions": {
    "allow": [
      "curl http://127.0.0.1:2585/*",
      "codeboard *"
    ]
  }
}
EOF`}</CodeBlock>

      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">验证</h4>
      <Paragraph>启动 claude 后输入「检查 CodeBoard 看板连接状态」即可验证。</Paragraph>
    </div>
  )
}

function OpenClawContent() {
  return (
    <div>
      <SectionTitle>在 OpenClaw Agent 中安装 CodeBoard Skills</SectionTitle>

      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">方式一：Agent 配置文件</h4>
      <CodeBlock>{`# 使用仓库 skills/codeboard/ 整目录（勿再用 skills/SKILL.md）
mkdir -p /path/to/agent/skills/codeboard
cp -R /path/to/codeboard/skills/codeboard/* /path/to/agent/skills/codeboard/

system_prompt_files:
  - skills/codeboard/SKILL.md
environment:
  CODEBOARD_API: "http://127.0.0.1:2585"`}</CodeBlock>

      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">方式二：AGENTS.md 配置</h4>
      <Paragraph>在项目根目录创建 AGENTS.md，写入看板对接指令和 API 地址。支持兼容 agents.md 标准的 Agent。</Paragraph>

      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">容器/远程环境</h4>
      <Paragraph>
        如果 Agent 运行在容器中，需要将 CodeBoard 监听地址改为 0.0.0.0（在左侧面板修改），或配置网络转发。
      </Paragraph>
    </div>
  )
}

function UIContent() {
  return (
    <div>
      <SectionTitle>界面布局说明</SectionTitle>
      <div className="space-y-4 mb-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">左侧面板 (Sidebar)</h4>
          <Paragraph>
            显示用户头像、昵称、服务器地址。点击头像可上传自定义头像（支持 1:1 裁剪）。
            服务地址旁的紫色魔法棒可生成 Skills 模板。底部「API 详情」按钮可查看所有 API。
          </Paragraph>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">顶部功能区</h4>
          <Paragraph>
            包含三个图标：全部项目管理、排序方式切换、垃圾篓。右侧是消息色块区，每个色块对应一个项目，点击自动滚动到该项目列。
          </Paragraph>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">看板区域</h4>
          <Paragraph>
            每列一个项目，可横向拖拽滚动。每列内是 Session 卡片流。点击项目名查看详情，hover 显示隐藏/丢弃按钮。
          </Paragraph>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Session 卡片</h4>
          <Paragraph>
            每张卡片代表一次 Agent 执行 Session。显示目标、任务列表和状态。
            已完成的 Session 底部显示任务总结。点击卡片可查看详细时间线。
          </Paragraph>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">期待卡片（白条带子）</h4>
          <Paragraph>
            最后一个已完成的 Session 下方会出现白色浮空带子。点击可输入提示词，复制后发送给 Agent 继续工作。
          </Paragraph>
        </div>
      </div>
    </div>
  )
}

function MessagesContent() {
  return (
    <div>
      <SectionTitle>消息提示说明</SectionTitle>

      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">消息色块</h4>
      <Paragraph>
        顶部消息区的彩色圆角方块对应各个项目的最新消息。颜色与项目设定颜色一致，点击后看板自动滚动到对应项目列。
      </Paragraph>

      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">任务状态标识</h4>
      <div className="space-y-2 mb-4">
        {[
          { color: 'bg-amber-400', label: '排队中 (queued)', desc: '任务已创建但尚未开始' },
          { color: 'bg-blue-400', label: '运行中 (running)', desc: '任务正在执行，脉冲闪烁' },
          { color: 'bg-green-400', label: '已完成 (completed)', desc: '任务已成功完成' }
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${item.color} shrink-0`} />
            <div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{item.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">系统通知</h4>
      <Paragraph>
        当 Agent 推送 session_start、task_complete、session_complete 等事件时，
        macOS 系统会弹出原生通知。即使应用最小化到托盘也能收到提醒。
      </Paragraph>

      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Session 完成总结</h4>
      <Paragraph>
        Agent 发送 session_complete 时会附带任务总结（summary 字段），
        该总结直接显示在 Session 卡片底部，无需点击即可预览本次执行概况。
      </Paragraph>
    </div>
  )
}
