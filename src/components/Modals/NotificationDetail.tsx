// ============================================================
// 消息详情弹窗
// 点击消息栏色块后弹出，展示指定项目的全部通知消息时间线
// 按时间倒序排列，每条消息标注类型、内容、精确时间
// 关闭弹窗时才标记已读，避免加载过程中的时序冲突
// ============================================================

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, CheckCircle, Loader2, MessageSquare, Flag, Bell } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import GlassCard from '../common/GlassCard'
import BlurOverlay from '../common/BlurOverlay'

/** 通知数据 */
interface NotificationItem {
  id: number
  project_id: string
  type: string
  content: string
  is_read: number
  color: string
  project_name: string
  created_at: string
}

/** 类型图标和标签配置 */
const TYPE_CONFIG: Record<string, { icon: typeof Play; color: string; label: string }> = {
  session_start: { icon: Play, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', label: 'Session 开始' },
  task_start: { icon: Loader2, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', label: '任务启动' },
  task_progress: { icon: MessageSquare, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20', label: '任务进展' },
  task_complete: { icon: CheckCircle, color: 'text-green-500 bg-green-50 dark:bg-green-900/20', label: '任务完成' },
  session_complete: { icon: Flag, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', label: 'Session 完成' }
}

export default function NotificationDetail() {
  const projectId = useUIStore(s => s.showNotificationDetail)
  const setShowNotificationDetail = useUIStore(s => s.setShowNotificationDetail)
  const projects = useProjectStore(s => s.projects)
  const markNotificationsRead = useProjectStore(s => s.markNotificationsRead)
  const storeNotifications = useProjectStore(s => s.notifications)

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  // 记录打开时的 projectId，用于关闭时标记已读
  const openedProjectRef = useRef<string | null>(null)

  const project = projects.find(p => p.project_id === projectId)

  // 加载通知数据（不在此处标记已读）
  useEffect(() => {
    if (!projectId) {
      setNotifications([])
      return
    }
    openedProjectRef.current = projectId
    setLoading(true)

    window.codeboard.getProjectNotifications(projectId)
      .then((data) => {
        const items = (data || []) as unknown as NotificationItem[]
        if (items.length > 0) {
          setNotifications(items)
        } else {
          // 回退：从 store 的未读通知中筛选该项目的通知
          const fallback = storeNotifications
            .filter(n => n.project_id === projectId)
            .map(n => ({
              id: n.id,
              project_id: n.project_id,
              type: n.type,
              content: n.content,
              is_read: n.is_read,
              color: n.color,
              project_name: n.project_name,
              created_at: n.created_at
            })) as NotificationItem[]
          setNotifications(fallback)
        }
      })
      .catch((err) => {
        console.error('加载项目通知失败:', err)
        // 错误时使用 store 中的通知作为回退
        const fallback = storeNotifications
          .filter(n => n.project_id === projectId)
          .map(n => ({
            id: n.id,
            project_id: n.project_id,
            type: n.type,
            content: n.content,
            is_read: n.is_read,
            color: n.color,
            project_name: n.project_name,
            created_at: n.created_at
          })) as NotificationItem[]
        setNotifications(fallback)
      })
      .finally(() => setLoading(false))
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  /** 关闭弹窗时标记已读 */
  const handleClose = useCallback(() => {
    const pid = openedProjectRef.current
    setShowNotificationDetail(null)
    // 延迟标记已读，确保不影响当前渲染
    if (pid) {
      setTimeout(() => markNotificationsRead(pid), 100)
    }
  }, [setShowNotificationDetail, markNotificationsRead])

  /** 格式化精确时间 */
  const formatPreciseTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    const s = d.getSeconds().toString().padStart(2, '0')
    return `${month}/${day} ${h}:${m}:${s}`
  }

  /** 按日期分组通知 */
  const groupByDate = (items: NotificationItem[]) => {
    const groups: { date: string; items: NotificationItem[] }[] = []
    for (const item of items) {
      const d = new Date(item.created_at)
      const dateKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
      const last = groups[groups.length - 1]
      if (last && last.date === dateKey) {
        last.items.push(item)
      } else {
        groups.push({ date: dateKey, items: [item] })
      }
    }
    return groups
  }

  if (!projectId) return null

  const grouped = groupByDate(notifications)
  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <AnimatePresence>
      {projectId && (
        <>
          <BlurOverlay onClick={handleClose} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 pointer-events-none">
            <GlassCard modal className="w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col pointer-events-auto">
              {/* 头部 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* 项目颜色标记 */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: project?.color || '#007AFF' }}
                  >
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {project?.name || '项目消息'}
                    </h2>
                    <p className="text-xs text-gray-400">
                      共 {notifications.length} 条消息
                      {unreadCount > 0 && (
                        <span className="ml-1.5 text-blue-500">({unreadCount} 条未读)</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  className="p-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-600/50 ml-3"
                  onClick={handleClose}
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* 消息时间线 */}
              <div className="flex-1 overflow-y-auto px-6 py-4 scroll-y-smooth">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                    <p className="text-sm text-gray-400">加载消息中...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Bell className="w-10 h-10 text-gray-200 dark:text-gray-700" />
                    <p className="text-sm text-gray-400">暂无消息记录</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {grouped.map(group => (
                      <div key={group.date}>
                        {/* 日期分割线 */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                          <span className="text-[10px] font-medium text-gray-400 shrink-0">{group.date}</span>
                          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                        </div>

                        {/* 该日期下的消息 */}
                        <div className="relative">
                          {/* 时间线连接线 */}
                          <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gray-200 dark:bg-gray-700" />

                          <div className="space-y-3">
                            {group.items.map((notif, i) => {
                              const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.task_progress
                              const Icon = config.icon
                              const isUnread = !notif.is_read
                              return (
                                <motion.div
                                  key={notif.id}
                                  className="flex gap-3 relative"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.03 }}
                                >
                                  {/* 时间线节点 */}
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${config.color}`}>
                                    <Icon className="w-3 h-3" />
                                  </div>

                                  {/* 内容 */}
                                  <div className={`flex-1 min-w-0 rounded-lg p-2.5 ${
                                    isUnread
                                      ? 'bg-blue-50/60 dark:bg-blue-900/15 border border-blue-200/30 dark:border-blue-700/30'
                                      : 'bg-gray-50/50 dark:bg-gray-800/30'
                                  }`}>
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-medium text-gray-700 dark:text-gray-200">{config.label}</span>
                                        {/* 未读标记圆点 */}
                                        {isUnread && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                        )}
                                      </div>
                                      <span className="text-[10px] text-gray-400 shrink-0 font-mono">{formatPreciseTime(notif.created_at)}</span>
                                    </div>
                                    {notif.content && (
                                      <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                                        {notif.content}
                                      </p>
                                    )}
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
