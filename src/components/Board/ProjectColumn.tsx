// ============================================================
// 项目列组件
// 每个项目占一列，顶部显示项目名，下方为 Session 卡片流
// 支持纵向滚动，卡片间有间隔
// ============================================================

import { useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Minus, X, Maximize2, Minimize2 } from 'lucide-react'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import { useSettingsStore } from '../../stores/settingsStore'
import SessionCard from '../SessionCard'

interface Project {
  project_id: string
  name: string
  description: string
  color: string
  status: string
  updated_at: string
}

interface SessionData {
  session_id: string
  project_id: string
  goal: string
  task_list: { name: string; status: string }[]
  status: string
  summary: string
  prompt_text?: string
  created_at: string
  updated_at: string
}

interface ProjectColumnProps {
  project: Project
  /** 放大模式：占满左半区域 */
  expanded?: boolean
  /** 仅渲染标题头部（展开模式下标题全宽） */
  headerOnly?: boolean
  /** 仅渲染卡片内容区（展开模式下标题独立） */
  bodyOnly?: boolean
  /** 选择中的 Session（用于全屏模式联动右侧面板） */
  selectedSessionId?: string | null
  /** 选中 Session 回调（用于全屏模式联动右侧面板） */
  onSelectSession?: (sessionId: string) => void
}

export default function ProjectColumn({
  project,
  expanded = false,
  headerOnly = false,
  bodyOnly = false,
  selectedSessionId = null,
  onSelectSession
}: ProjectColumnProps) {
  // 避免在 selector 中创建新数组引用导致无限循环
  const allSessions = useProjectStore(s => s.sessions)
  const sessions = useMemo(
    () => (allSessions[project.project_id] ?? []) as SessionData[],
    [allSessions, project.project_id]
  )
  const loadSessions = useProjectStore(s => s.loadSessions)
  const hideProject = useProjectStore(s => s.hideProject)
  const trashProject = useProjectStore(s => s.trashProject)
  const setShowProjectDetail = useUIStore(s => s.setShowProjectDetail)
  const scrollToProject = useUIStore(s => s.scrollToProject)
  const setScrollToProject = useUIStore(s => s.setScrollToProject)
  const expandedProject = useUIStore(s => s.expandedProject)
  const setExpandedProject = useUIStore(s => s.setExpandedProject)
  const isExpanded = expandedProject === project.project_id
  const showRunningGuide = useSettingsStore(s => s.displayConfig.showRunningGuide)

  const columnRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 加载 Sessions
  useEffect(() => {
    loadSessions(project.project_id)
  }, [project.project_id, loadSessions])

  // 处理消息区点击后自动滚动到此列
  useEffect(() => {
    if (scrollToProject === project.project_id && columnRef.current) {
      columnRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center' })
      // 列内滚动到最新卡片
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
        }
      }, 300)
      setScrollToProject(null)
    }
  }, [scrollToProject, project.project_id, setScrollToProject])

  // 按时间过滤 Sessions 并根据卡片排序设置排序
  const timeFilter = useUIStore(s => s.timeFilter)
  const cardSortOrder = useUIStore(s => s.cardSortOrder)
  const filteredSessions = useMemo(() => {
    let result = sessions
    if (timeFilter !== 'all') {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yesterdayStart = new Date(todayStart.getTime() - 86400000)
      result = sessions.filter(s => {
        const d = new Date(s.updated_at || s.created_at)
        switch (timeFilter) {
          case 'today': return d >= todayStart
          case 'yesterday_today': return d >= yesterdayStart
          case 'recent': return d >= new Date(now.getTime() - 7 * 86400000)
          default: return true
        }
      })
    }
    // 卡片排序：默认最新在前（降序），可选最早在前（升序）
    return [...result].sort((a, b) => {
      const ta = new Date(a.updated_at || a.created_at).getTime()
      const tb = new Date(b.updated_at || b.created_at).getTime()
      return cardSortOrder === 'oldest' ? ta - tb : tb - ta
    })
  }, [sessions, timeFilter, cardSortOrder])

  // 判断项目运行状态：是否有 running session / 是否所有 session 都已完成
  const hasRunningSessions = sessions.some(s => s.status === 'running')
  const allSessionsCompleted = sessions.length > 0 && sessions.every(s => s.status === 'completed')

  /** 渲染项目头部 */
  const renderHeader = () => (
    <div
      className="px-4 py-3 flex items-center justify-between cursor-pointer group"
      style={{ borderBottom: `2px solid ${project.color}` }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => setShowProjectDetail(project.project_id)}>
        {/* 颜色标记圆点 — 运行中闪烁，全部完成绿色环 */}
        <span
          className={`w-3 h-3 rounded-full flex-shrink-0 ${
            showRunningGuide && hasRunningSessions ? 'status-blink' : ''
          } ${
            showRunningGuide && allSessionsCompleted ? 'status-complete-ring' : ''
          }`}
          style={{ backgroundColor: project.color }}
        />
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{project.name}</h3>
      </div>

      {/* macOS 风格操作按钮组 */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* 隐藏按钮 (-) — 黄色 */}
        <motion.button
          className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 flex items-center justify-center"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.85 }}
          onClick={e => { e.stopPropagation(); hideProject(project.project_id) }}
          title="隐藏到全部项目"
        >
          <Minus className="w-2 h-2 text-yellow-800 opacity-0 group-hover:opacity-100" />
        </motion.button>
        {/* 放大/缩小按钮 — 绿色 */}
        <motion.button
          className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 flex items-center justify-center"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.85 }}
          onClick={e => {
            e.stopPropagation()
            setExpandedProject(isExpanded ? null : project.project_id)
          }}
          title={isExpanded ? '缩小' : '放大'}
        >
          {isExpanded
            ? <Minimize2 className="w-1.5 h-1.5 text-green-800 opacity-0 group-hover:opacity-100" />
            : <Maximize2 className="w-1.5 h-1.5 text-green-800 opacity-0 group-hover:opacity-100" />
          }
        </motion.button>
        {/* 丢弃按钮 (x) — 红色 */}
        <motion.button
          className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 flex items-center justify-center"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.85 }}
          onClick={e => { e.stopPropagation(); trashProject(project.project_id) }}
          title="移入垃圾篓"
        >
          <X className="w-2 h-2 text-red-800 opacity-0 group-hover:opacity-100" />
        </motion.button>
      </div>
    </div>
  )

  /** 渲染 Session 卡片流区域 */
  const renderBody = () => (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto scroll-y-smooth p-3 space-y-3 column-scroll"
      onMouseDown={e => e.stopPropagation()}
    >
      {filteredSessions.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-xs text-gray-400 dark:text-gray-500">暂无 Session 记录</p>
        </div>
      ) : (
        filteredSessions.map((session, index) => {
          const hasRunning = filteredSessions.some(s => s.status === 'running')
          const shouldCollapse = hasRunning && session.status === 'completed'
          return (
            <SessionCard
              key={session.session_id}
              session={session}
              color={project.color}
              isLast={index === 0}
              collapsed={shouldCollapse}
              selectMode={!!onSelectSession}
              selected={selectedSessionId === session.session_id}
              onSelect={onSelectSession}
            />
          )
        })
      )}
    </div>
  )

  // 展开模式仅渲染头部
  if (headerOnly) {
    return (
      <div className="w-full bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm">
        {renderHeader()}
      </div>
    )
  }

  // 展开模式仅渲染卡片内容区
  if (bodyOnly) {
    return (
      <div className="h-full flex flex-col overflow-hidden w-full bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm">
        {renderBody()}
      </div>
    )
  }

  return (
    <motion.div
      ref={columnRef}
      className={`h-full flex flex-col overflow-hidden ${
        expanded
          ? 'w-full bg-white/50 dark:bg-neutral-800/50'
          : 'flex-shrink-0 w-[20%] min-w-[260px] rounded-2xl bg-white/40 dark:bg-neutral-800/40 border border-white/20 dark:border-white/5'
      } backdrop-blur-sm`}
      style={expanded ? undefined : { scrollSnapAlign: 'start' }}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      layout
    >
      {renderHeader()}
      {renderBody()}
    </motion.div>
  )
}
