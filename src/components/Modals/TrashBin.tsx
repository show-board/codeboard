// ============================================================
// 垃圾篓弹窗
// 分为「项目垃圾篓」和「Session 垃圾篓」两个标签页
// 支持恢复、永久删除、选择性清空
// ============================================================

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RotateCcw, Trash2, ChevronDown, Layers, Clock } from 'lucide-react'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import GlassCard from '../common/GlassCard'
import BlurOverlay from '../common/BlurOverlay'

type Tab = 'projects' | 'sessions'
type ClearMode = 'all' | 'projects' | 'sessions'

/** 已回收的 Session 数据结构（含所属项目信息） */
interface TrashedSession {
  session_id: string
  project_id: string
  goal: string
  status: string
  summary: string
  project_name: string
  project_color: string
  created_at: string
  updated_at: string
}

export default function TrashBin() {
  const show = useUIStore(s => s.showTrashBin)
  const setShow = useUIStore(s => s.setShowTrashBin)
  const projects = useProjectStore(s => s.projects)
  const restoreProject = useProjectStore(s => s.restoreProject)
  const permanentDeleteProject = useProjectStore(s => s.permanentDeleteProject)
  const loadProjects = useProjectStore(s => s.loadProjects)

  const [activeTab, setActiveTab] = useState<Tab>('projects')
  const [trashedSessions, setTrashedSessions] = useState<TrashedSession[]>([])
  const [showClearMenu, setShowClearMenu] = useState(false)
  const [clearing, setClearing] = useState(false)

  const trashedProjects = projects.filter(p => p.status === 'trashed')

  // 加载已回收的 Sessions
  const loadTrashedSessions = useCallback(async () => {
    try {
      const sessions = await window.codeboard.getTrashedSessions()
      setTrashedSessions(sessions as unknown as TrashedSession[])
    } catch (err) {
      console.error('加载已回收 Sessions 失败:', err)
    }
  }, [])

  useEffect(() => {
    if (show) {
      loadTrashedSessions()
    }
  }, [show, loadTrashedSessions])

  /** 恢复 Session */
  const handleRestoreSession = async (sessionId: string, projectId: string) => {
    await window.codeboard.restoreSession(sessionId)
    loadTrashedSessions()
    // 刷新对应项目的 sessions 列表
    const store = useProjectStore.getState()
    store.loadSessions(projectId)
  }

  /** 永久删除 Session */
  const handleDeleteSession = async (sessionId: string) => {
    await window.codeboard.permanentDeleteSession(sessionId)
    loadTrashedSessions()
  }

  /** 清空操作 */
  const handleClear = async (mode: ClearMode) => {
    setShowClearMenu(false)
    setClearing(true)
    try {
      if (mode === 'all' || mode === 'projects') {
        await window.codeboard.clearTrashedProjects()
        loadProjects()
      }
      if (mode === 'all' || mode === 'sessions') {
        await window.codeboard.clearTrashedSessions()
        loadTrashedSessions()
      }
    } catch (err) {
      console.error('清空垃圾篓失败:', err)
    } finally {
      setClearing(false)
    }
  }

  /** 格式化时间 */
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const totalCount = trashedProjects.length + trashedSessions.length

  return (
    <AnimatePresence>
      {show && (
        <>
          <BlurOverlay onClick={() => setShow(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 pointer-events-none">
            <GlassCard modal className="w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col pointer-events-auto">
              {/* 头部 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 shrink-0">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">垃圾篓</h2>
                  {totalCount > 0 && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded-full">
                      {totalCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* 清空下拉菜单 */}
                  {totalCount > 0 && (
                    <div className="relative">
                      <motion.button
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowClearMenu(!showClearMenu)}
                        disabled={clearing}
                      >
                        {clearing ? '清空中...' : '清空'}
                        <ChevronDown className="w-3 h-3" />
                      </motion.button>

                      <AnimatePresence>
                        {showClearMenu && (
                          <motion.div
                            className="absolute right-0 top-full mt-1 min-w-[160px] py-1 rounded-xl bg-white/95 dark:bg-neutral-800/95 backdrop-blur-xl shadow-lg border border-gray-200/60 dark:border-gray-700/60 z-10"
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15 }}
                          >
                            <button
                              className="w-full px-4 py-2 text-left text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              onClick={() => handleClear('all')}
                            >
                              清空所有 ({totalCount})
                            </button>
                            {trashedProjects.length > 0 && (
                              <button
                                className="w-full px-4 py-2 text-left text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                onClick={() => handleClear('projects')}
                              >
                                仅清空项目 ({trashedProjects.length})
                              </button>
                            )}
                            {trashedSessions.length > 0 && (
                              <button
                                className="w-full px-4 py-2 text-left text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                onClick={() => handleClear('sessions')}
                              >
                                仅清空 Session ({trashedSessions.length})
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <button
                    className="p-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-600/50"
                    onClick={() => { setShow(false); setShowClearMenu(false) }}
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* 标签页切换 */}
              <div className="flex border-b border-gray-200/50 dark:border-gray-700/50 shrink-0">
                <button
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
                    activeTab === 'projects'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('projects')}
                >
                  <Layers className="w-3.5 h-3.5" />
                  项目 ({trashedProjects.length})
                </button>
                <button
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
                    activeTab === 'sessions'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('sessions')}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Session ({trashedSessions.length})
                </button>
              </div>

              {/* 内容区域 */}
              <div className="flex-1 overflow-y-auto p-4 scroll-y-smooth space-y-2">
                <AnimatePresence mode="wait">
                  {/* 项目垃圾篓 */}
                  {activeTab === 'projects' && (
                    <motion.div
                      key="projects"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      {trashedProjects.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-8">项目垃圾篓为空</p>
                      ) : (
                        trashedProjects.map(project => (
                          <motion.div
                            key={project.project_id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-neutral-700 border border-gray-200/50 dark:border-gray-600/50"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                          >
                            <span className="w-3 h-3 rounded-full flex-shrink-0 opacity-50" style={{ backgroundColor: project.color }} />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-gray-600 dark:text-gray-300 truncate block">{project.name}</span>
                              <span className="text-[10px] text-gray-400">{project.description || '无描述'}</span>
                            </div>

                            <motion.button
                              className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-500"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => restoreProject(project.project_id)}
                              title="恢复项目"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </motion.button>

                            <motion.button
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => permanentDeleteProject(project.project_id)}
                              title="永久删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </motion.div>
                        ))
                      )}
                    </motion.div>
                  )}

                  {/* Session 垃圾篓 */}
                  {activeTab === 'sessions' && (
                    <motion.div
                      key="sessions"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      {trashedSessions.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-8">Session 垃圾篓为空</p>
                      ) : (
                        trashedSessions.map(session => (
                          <motion.div
                            key={session.session_id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-neutral-700 border border-gray-200/50 dark:border-gray-600/50"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                          >
                            {/* 项目颜色标记 */}
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0 opacity-50"
                              style={{ backgroundColor: session.project_color }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                                {session.goal || '未设置目标'}
                              </p>
                              <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
                                <span>{session.project_name}</span>
                                <span>·</span>
                                <span>{formatTime(session.updated_at || session.created_at)}</span>
                              </p>
                            </div>

                            <motion.button
                              className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-500"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleRestoreSession(session.session_id, session.project_id)}
                              title="恢复 Session"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </motion.button>

                            <motion.button
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDeleteSession(session.session_id)}
                              title="永久删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </motion.button>
                          </motion.div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
