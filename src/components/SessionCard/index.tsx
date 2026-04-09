// ============================================================
// Session 卡片组件
// 显示一次 Agent Session 的信息：目标、任务列表、状态
// 支持折叠模式（历史卡片在有新 running Session 时自动折叠）
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Trash2, Eye } from 'lucide-react'
import StatusBadge from '../common/StatusBadge'
import TaskList from './TaskList'
import WaitingRibbon from './WaitingRibbon'
import { useUIStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { useSettingsStore } from '../../stores/settingsStore'

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

interface SessionCardProps {
  session: SessionData
  color: string
  isLast: boolean
  /** 是否自动折叠（有新 running Session 时，历史完成卡片折叠） */
  collapsed?: boolean
  /** 选择模式：点击卡片只用于选中（全屏右侧联动） */
  selectMode?: boolean
  /** 当前卡片是否被选中 */
  selected?: boolean
  /** 选中回调 */
  onSelect?: (sessionId: string) => void
}

export default function SessionCard({
  session,
  color,
  isLast,
  collapsed = false,
  selectMode = false,
  selected = false,
  onSelect
}: SessionCardProps) {
  const setShowTaskDetail = useUIStore(s => s.setShowTaskDetail)
  const trashSession = useProjectStore(s => s.trashSession)
  const cardHeightMode = useSettingsStore(s => s.displayConfig.cardHeightMode)
  // 用户手动展开/折叠覆盖自动折叠状态
  const [manualExpand, setManualExpand] = useState<boolean | null>(null)
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // 实际是否折叠：用户手动操作 > 自动折叠逻辑
  const isCollapsed = manualExpand !== null ? !manualExpand : collapsed

  /** 右键打开上下文菜单 */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  /** 点击外部关闭菜单 */
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [contextMenu])

  /** 删除卡片（移入垃圾篓） */
  const handleTrash = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setContextMenu(null)
    trashSession(session.session_id, session.project_id)
  }, [session.session_id, session.project_id, trashSession])

  /** 查看详情 */
  const handleViewDetail = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setContextMenu(null)
    setShowTaskDetail(session.session_id)
  }, [session.session_id, setShowTaskDetail])

  /** 格式化时间 */
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  /** 切换展开/折叠 */
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setManualExpand(prev => prev === null ? !collapsed : !prev)
  }

  /** 点击卡片：普通模式打开详情，选择模式仅切换当前会话 */
  const handleCardClick = useCallback(() => {
    if (selectMode) {
      onSelect?.(session.session_id)
      return
    }
    setShowTaskDetail(session.session_id)
  }, [selectMode, onSelect, session.session_id, setShowTaskDetail])

  /** 右键菜单浮层 — 使用 Portal 渲染到 body，避免被父元素 overflow/transform 裁剪 */
  const contextMenuPortal = contextMenu && createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[140px] py-1 rounded-xl bg-white/95 dark:bg-neutral-800/95 backdrop-blur-xl shadow-lg border border-gray-200/60 dark:border-gray-700/60"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
        onClick={handleViewDetail}
        onMouseDown={e => e.stopPropagation()}
      >
        <Eye className="w-3.5 h-3.5" />
        查看详情
      </button>
      <div className="mx-2 my-0.5 border-t border-gray-200/50 dark:border-gray-700/50" />
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        onClick={handleTrash}
        onMouseDown={e => e.stopPropagation()}
      >
        <Trash2 className="w-3.5 h-3.5" />
        删除卡片
      </button>
    </div>,
    document.body
  )

  // 折叠模式：只显示状态 + 时间 + 一行总结
  if (isCollapsed) {
    return (
      <>
        {contextMenuPortal}
        <motion.div
        className={`rounded-lg overflow-hidden cursor-pointer transition-colors ${
          selected
            ? 'bg-blue-50/80 dark:bg-blue-900/20 ring-1 ring-blue-400/60'
            : 'bg-white/50 dark:bg-neutral-700/50 hover:bg-white/70 dark:hover:bg-neutral-700/70'
        }`}
        style={{ borderLeft: `3px solid ${color}` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        layout
        onContextMenu={handleContextMenu}
        onClick={handleCardClick}
      >
        <div className="px-3 py-2 flex items-center gap-2">
          {/* 展开按钮 */}
          <button onClick={toggleExpand} className="shrink-0 p-0.5 rounded hover:bg-gray-200/50 dark:hover:bg-gray-600/50">
            <ChevronRight className="w-3 h-3 text-gray-400" />
          </button>
          <StatusBadge status={session.status} />
          <span className="text-[10px] text-gray-400 shrink-0">{formatTime(session.updated_at || session.created_at)}</span>
          {/* 折叠时显示总结或目标的单行摘要 */}
          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate flex-1 min-w-0">
            {session.summary || session.goal || '未设置目标'}
          </p>
          {/* 点击打开详情 */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowTaskDetail(session.session_id) }}
            className="text-[10px] text-blue-500 hover:text-blue-600 shrink-0"
          >
            详情
          </button>
        </div>
        </motion.div>
      </>
    )
  }

  // 展开模式：完整卡片
  return (
    <div>
      {contextMenuPortal}
      <motion.div
        className={`rounded-xl overflow-hidden cursor-pointer transition-shadow ${
          selected
            ? 'bg-blue-50/80 dark:bg-blue-900/20 ring-1 ring-blue-400/60 shadow-md'
            : 'bg-white/70 dark:bg-neutral-700/70 hover:shadow-md'
        }`}
        style={{ borderLeft: `3px solid ${color}` }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01, y: -1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        layout
        onClick={handleCardClick}
        onContextMenu={handleContextMenu}
      >
        <div className="p-3">
          {/* 顶部：折叠按钮 + 状态 + 时间 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              {/* 只有已完成的卡片才显示折叠按钮 */}
              {session.status === 'completed' && (
                <button onClick={toggleExpand} className="shrink-0 p-0.5 rounded hover:bg-gray-200/50 dark:hover:bg-gray-600/50">
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>
              )}
              <StatusBadge status={session.status} />
            </div>
            <span className="text-[10px] text-gray-400">{formatTime(session.updated_at || session.created_at)}</span>
          </div>

          {/* 目标 —— full 模式不限行数，fixed 模式限制 2 行 */}
          <p className={`text-xs font-medium text-gray-700 dark:text-gray-200 mb-2 leading-relaxed whitespace-pre-wrap ${
            cardHeightMode === 'fixed' ? 'line-clamp-2' : ''
          }`}>
            {session.goal || '未设置目标'}
          </p>

          {/* 任务列表 —— full 模式展示全部，fixed 模式最多 5 项 */}
          <TaskList tasks={cardHeightMode === 'fixed' ? (session.task_list || []).slice(0, 5) : (session.task_list || [])} />
          {cardHeightMode === 'fixed' && session.task_list && session.task_list.length > 5 && (
            <p className="text-[10px] text-gray-400 mt-1">+{session.task_list.length - 5} 项更多任务</p>
          )}

          {/* 完成总结 —— full 模式不限行数，fixed 模式限制 4 行 */}
          {session.status === 'completed' && session.summary && (
            <div className="mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-600/50">
              <div className="flex items-start gap-1.5">
                <span className="text-[10px] text-green-500 font-medium shrink-0 mt-px">总结</span>
                <p className={`text-[10px] text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap ${
                  cardHeightMode === 'fixed' ? 'line-clamp-4' : ''
                }`}>
                  {session.summary}
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* 最后一个已完成的 Session 显示期待卡片 */}
      {isLast && session.status === 'completed' && (
        <WaitingRibbon sessionId={session.session_id} existingPrompt={session.prompt_text} />
      )}
    </div>
  )
}
