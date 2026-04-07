// ============================================================
// 任务详情弹窗
// 点击 Session 卡片后展开，显示该 Session 的完整信息时间线
// 包括：Session 目标、初始任务列表、每步更新记录、最终总结
// ============================================================

import { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, CheckCircle, Loader2, MessageSquare, Flag, Target, ListChecks } from 'lucide-react'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import GlassCard from '../common/GlassCard'
import BlurOverlay from '../common/BlurOverlay'

/** 更新类型图标和颜色映射 */
const TYPE_CONFIG: Record<string, { icon: typeof Play; color: string; label: string }> = {
  session_start: { icon: Play, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', label: 'Session 开始' },
  task_start: { icon: Loader2, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', label: '任务启动' },
  task_progress: { icon: MessageSquare, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20', label: '任务进展' },
  task_complete: { icon: CheckCircle, color: 'text-green-500 bg-green-50 dark:bg-green-900/20', label: '任务完成' },
  session_complete: { icon: Flag, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', label: 'Session 完成' }
}

/** 任务状态颜色映射 */
const TASK_STATUS_COLOR: Record<string, string> = {
  queued: 'bg-amber-400',
  running: 'bg-blue-400',
  completed: 'bg-green-400'
}

/** 尝试解析 JSON 内容中的 goal 和 task_list */
function parseSessionContent(content: string): { goal?: string; task_list?: { name: string; status: string }[] } | null {
  try {
    const parsed = JSON.parse(content)
    if (parsed && typeof parsed === 'object' && (parsed.goal || parsed.task_list)) return parsed
  } catch { /* 非 JSON 格式 */ }
  return null
}

export default function TaskDetail() {
  const sessionId = useUIStore(s => s.showTaskDetail)
  const setShowTaskDetail = useUIStore(s => s.setShowTaskDetail)
  const allTaskUpdates = useProjectStore(s => s.taskUpdates)
  const sessionDetails = useProjectStore(s => s.sessionDetails)
  const taskUpdates = useMemo(
    () => (sessionId ? allTaskUpdates[sessionId] ?? [] : []),
    [sessionId, allTaskUpdates]
  )
  const sessionDetail = sessionId ? sessionDetails[sessionId] : null
  const loadTaskUpdates = useProjectStore(s => s.loadTaskUpdates)

  // 加载任务更新记录及 Session 详情
  useEffect(() => {
    if (sessionId) {
      loadTaskUpdates(sessionId)
    }
  }, [sessionId, loadTaskUpdates])

  /** 格式化完整时间（含日期） */
  const formatFullTime = (str: string) => {
    const d = new Date(str)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
  }

  /** 格式化时间（仅时分秒） */
  const formatTime = (str: string) => new Date(str).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <AnimatePresence>
      {sessionId && (
        <>
          <BlurOverlay onClick={() => setShowTaskDetail(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 pointer-events-none">
            <GlassCard modal className="w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col pointer-events-auto">
              {/* 头部 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 shrink-0">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">任务详情</h2>
                  <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{sessionId}</p>
                </div>
                <button
                  className="p-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-600/50 ml-3"
                  onClick={() => setShowTaskDetail(null)}
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Session 概要信息区 */}
              {sessionDetail && (
                <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 space-y-3 shrink-0">
                  {/* 目标 */}
                  {sessionDetail.goal && (
                    <div className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">Session 目标</p>
                        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{sessionDetail.goal}</p>
                      </div>
                    </div>
                  )}
                  {/* 任务列表 */}
                  {sessionDetail.task_list && sessionDetail.task_list.length > 0 && (
                    <div className="flex items-start gap-2">
                      <ListChecks className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">任务列表 ({sessionDetail.task_list.length})</p>
                        <div className="space-y-1">
                          {sessionDetail.task_list.map((task, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${TASK_STATUS_COLOR[task.status] || 'bg-gray-400'}`} />
                              <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{task.name}</span>
                              <span className="text-[10px] text-gray-400 shrink-0">{task.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* 时间信息 */}
                  <div className="flex items-center gap-4 text-[10px] text-gray-400">
                    <span>创建: {formatFullTime(sessionDetail.created_at)}</span>
                    <span>更新: {formatFullTime(sessionDetail.updated_at)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      sessionDetail.status === 'completed' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                      : sessionDetail.status === 'running' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                    }`}>{sessionDetail.status}</span>
                  </div>
                </div>
              )}

              {/* 完整时间线 */}
              <div className="flex-1 overflow-y-auto px-6 py-4 scroll-y-smooth">
                {taskUpdates.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">暂无任务更新记录</p>
                ) : (
                  <div className="relative">
                    {/* 时间线连接线 */}
                    <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gray-200 dark:bg-gray-700" />

                    <div className="space-y-4">
                      {taskUpdates.map((update, i) => {
                        const config = TYPE_CONFIG[update.type] || TYPE_CONFIG.task_progress
                        const Icon = config.icon
                        const parsedContent = update.content ? parseSessionContent(update.content) : null

                        return (
                          <motion.div
                            key={update.id || i}
                            className="flex gap-3 relative"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            {/* 时间线节点 */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${config.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>

                            {/* 内容 */}
                            <div className="flex-1 min-w-0 pb-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{config.label}</span>
                                <span className="text-[10px] text-gray-400">{formatTime(update.created_at)}</span>
                              </div>

                              {/* 任务名称 */}
                              {update.task_name && (
                                <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mb-1">{update.task_name}</p>
                              )}

                              {/* 任务规划 */}
                              {update.task_plan && (
                                <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-2 mt-1 mb-1">
                                  <p className="text-[10px] font-medium text-blue-500 mb-0.5">规划</p>
                                  <p className="text-[11px] text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{update.task_plan}</p>
                                </div>
                              )}

                              {/* 任务总结 */}
                              {update.task_summary && (
                                <div className="bg-green-50/50 dark:bg-green-900/10 rounded-lg p-2 mt-1 mb-1">
                                  <p className="text-[10px] font-medium text-green-500 mb-0.5">总结</p>
                                  <p className="text-[11px] text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{update.task_summary}</p>
                                </div>
                              )}

                              {/* 解析后的 session_start 结构化内容：goal + task_list */}
                              {parsedContent && (
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 mt-1 space-y-2">
                                  {parsedContent.goal && (
                                    <div>
                                      <p className="text-[10px] font-medium text-blue-500 mb-0.5">目标</p>
                                      <p className="text-[11px] text-gray-600 dark:text-gray-300">{parsedContent.goal}</p>
                                    </div>
                                  )}
                                  {parsedContent.task_list && parsedContent.task_list.length > 0 && (
                                    <div>
                                      <p className="text-[10px] font-medium text-purple-500 mb-1">初始任务列表</p>
                                      {parsedContent.task_list.map((t, idx) => (
                                        <div key={idx} className="flex items-center gap-2 ml-1">
                                          <span className={`w-1.5 h-1.5 rounded-full ${TASK_STATUS_COLOR[t.status] || 'bg-gray-400'}`} />
                                          <span className="text-[11px] text-gray-600 dark:text-gray-300">{t.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 纯文本 content（非 JSON 格式时显示） */}
                              {update.content && !parsedContent && !update.task_summary && (
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 mt-1">
                                  <p className="text-[11px] text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{update.content}</p>
                                </div>
                              )}

                              {/* session_complete 节点始终展示 session 总结（从 sessionDetail 获取） */}
                              {update.type === 'session_complete' && sessionDetail?.summary && (
                                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg p-2 mt-1">
                                  <p className="text-[10px] font-medium text-emerald-500 mb-0.5">Session 总结</p>
                                  <p className="text-[11px] text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{sessionDetail.summary}</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 底部总结区（Session 已完成时显示） */}
              {sessionDetail?.status === 'completed' && sessionDetail?.summary && (
                <div className="px-6 py-3 border-t border-gray-200/50 dark:border-gray-700/50 shrink-0">
                  <div className="flex items-start gap-2">
                    <Flag className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">完成总结</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{sessionDetail.summary}</p>
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
