// ============================================================
// 主看板区域
// 横向滚动的项目列容器，支持触控板/鼠标横向拖拽滚动
// 项目列总宽度超过展示区时可左右滑动
// 支持单项目放大模式（左卡片 + 右 hooks 统计面板）
// ============================================================

import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import ProjectColumn from './ProjectColumn'
import ExpandedHooksPanel from './ExpandedHooksPanel'

export default function Board() {
  const projects = useProjectStore(s => s.projects)
  const sessionsByProject = useProjectStore(s => s.sessions)
  const sortType = useUIStore(s => s.sortType)
  const sortOrder = useUIStore(s => s.sortOrder)
  const expandedProject = useUIStore(s => s.expandedProject)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  // 只显示 visible 状态的项目，支持正序/倒序
  const visibleProjects = useMemo(() => {
    const visible = projects.filter(p => p.status === 'visible')
    // 排序方向因子：desc 时为 1（默认降序），asc 时为 -1（反转）
    const dir = sortOrder === 'asc' ? -1 : 1
    switch (sortType) {
      case 'name':
        return [...visible].sort((a, b) => dir * b.name.localeCompare(a.name))
      case 'started':
        return [...visible].sort((a, b) => dir * (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      case 'updated':
      default:
        return [...visible].sort((a, b) => dir * (new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()))
    }
  }, [projects, sortType, sortOrder])

  // 找到当前放大的项目对象
  const expandedProjectData = useMemo(
    () => expandedProject ? visibleProjects.find(p => p.project_id === expandedProject) : null,
    [expandedProject, visibleProjects]
  )

  // 全屏模式下自动选中一个 Session（优先 running，其次最新更新）
  useEffect(() => {
    if (!expandedProjectData) {
      setSelectedSessionId(null)
      return
    }
    const projectSessions = (sessionsByProject[expandedProjectData.project_id] || []) as {
      session_id: string
      status: string
      updated_at: string
      created_at: string
    }[]

    if (projectSessions.length === 0) {
      setSelectedSessionId(null)
      return
    }

    // 当前选中仍存在则保持，避免频繁切换
    const stillExists = selectedSessionId
      ? projectSessions.some(session => session.session_id === selectedSessionId)
      : false
    if (stillExists) return

    const sorted = [...projectSessions].sort((a, b) =>
      new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    )
    const running = sorted.find(session => session.status === 'running')
    setSelectedSessionId((running || sorted[0]).session_id)
  }, [expandedProjectData, sessionsByProject, selectedSessionId])

  // 鼠标拖拽横向滚动（仅在直接点击 Board 背景时触发，不干扰子列纵向滚动）
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return
    const target = e.target as HTMLElement
    if (target !== scrollRef.current && !target.classList.contains('board-drag-zone')) return
    setIsDragging(true)
    setStartX(e.pageX - scrollRef.current.offsetLeft)
    setScrollLeft(scrollRef.current.scrollLeft)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 1.5
    scrollRef.current.scrollLeft = scrollLeft - walk
  }, [isDragging, startX, scrollLeft])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // ---- 放大模式：标题全宽，下方左半卡片右半 hooks 统计 ----
  if (expandedProjectData) {
    return (
      <motion.div
        className="h-full flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
      >
        {/* 全宽标题栏 */}
        <motion.div
          className="shrink-0"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <ProjectColumn project={expandedProjectData} expanded headerOnly />
        </motion.div>

        {/* 下方区域：左半卡片列 + 右半 hooks 统计面板 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左半：Session 卡片列（50%） */}
          <motion.div
            className="w-1/2 h-full"
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <ProjectColumn
              project={expandedProjectData}
              expanded
              bodyOnly
              selectedSessionId={selectedSessionId}
              onSelectSession={setSelectedSessionId}
            />
          </motion.div>

          {/* 右半：Session hooks 展示面板（50%） */}
          <motion.div
            className="w-1/2 h-full border-l border-gray-200/50 dark:border-gray-700/50"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <ExpandedHooksPanel
              projectId={expandedProjectData.project_id}
              projectName={expandedProjectData.name}
              sessionId={selectedSessionId}
            />
          </motion.div>
        </div>
      </motion.div>
    )
  }

  // ---- 常规模式：多列横向滚动 ----
  return (
    <motion.div
      ref={scrollRef}
      className={`h-full flex gap-4 p-4 overflow-x-auto scroll-x-smooth ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {visibleProjects.length === 0 ? (
        <motion.div
          className="flex-1 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-center p-8 rounded-2xl bg-white/60 dark:bg-neutral-800/60 backdrop-blur-lg shadow-md border border-gray-200/50 dark:border-gray-700/50">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">暂无项目</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              通过 API 或 CLI 注册你的第一个项目
            </p>
            <div className="inline-block px-4 py-2 rounded-lg bg-gray-100 dark:bg-neutral-700">
              <code className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                codeboard project register --name &quot;项目名&quot;
              </code>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              或使用 curl POST http://127.0.0.1:2585/api/projects/register
            </p>
          </div>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          {visibleProjects.map(project => (
            <ProjectColumn key={project.project_id} project={project} />
          ))}
        </AnimatePresence>
      )}
    </motion.div>
  )
}
