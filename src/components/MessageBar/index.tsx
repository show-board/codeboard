// ============================================================
// 消息区组件
// 显示收到的项目消息彩色圆角方块
// 每种颜色对应一个项目，点击后看板动画滑动到对应项目列
// ============================================================

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'

export default function MessageBar() {
  const notifications = useProjectStore(s => s.notifications)
  const markNotificationsRead = useProjectStore(s => s.markNotificationsRead)
  const setScrollToProject = useUIStore(s => s.setScrollToProject)
  const setShowNotificationDetail = useUIStore(s => s.setShowNotificationDetail)

  // 按项目颜色去重，每种颜色只显示一个方块
  const colorBlocks = useMemo(() => {
    const seen = new Map<string, { color: string; project_id: string; project_name: string; count: number }>()
    for (const n of notifications) {
      if (!seen.has(n.color)) {
        seen.set(n.color, {
          color: n.color,
          project_id: n.project_id,
          project_name: n.project_name,
          count: 1
        })
      } else {
        seen.get(n.color)!.count++
      }
    }
    return Array.from(seen.values())
  }, [notifications])

  /** 单击色块：弹出消息详情弹窗查看该项目的详细消息时间线 */
  const handleClick = (projectId: string) => {
    setShowNotificationDetail(projectId)
  }

  /** 双击色块：跳转到对应项目列并标记已读 */
  const handleDoubleClick = (projectId: string) => {
    setScrollToProject(projectId)
    markNotificationsRead(projectId)
  }

  if (colorBlocks.length === 0) {
    return (
      <div className="flex items-center h-full px-4">
        <span className="text-xs text-gray-400 dark:text-gray-500 italic">暂无新消息</span>
      </div>
    )
  }

  return (
    <div className="flex items-center h-full px-4 gap-1.5 flex-wrap overflow-hidden">
      {colorBlocks.map((block, i) => (
        <motion.button
          key={block.project_id}
          className="relative rounded-lg min-w-[28px] h-7 px-2 flex items-center justify-center shadow-sm"
          style={{ backgroundColor: block.color }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.05, type: 'spring', stiffness: 500, damping: 30 }}
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleClick(block.project_id)}
          onDoubleClick={() => handleDoubleClick(block.project_id)}
          title={`${block.project_name} (${block.count} 条消息) — 单击查看详情，双击跳转`}
        >
          {/* 消息数量气泡 */}
          {block.count > 1 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold">
              {block.count > 9 ? '9+' : block.count}
            </span>
          )}
          {/* 项目名首字 */}
          <span className="text-[10px] font-bold text-white/90 truncate max-w-[40px]">
            {block.project_name.charAt(0)}
          </span>
        </motion.button>
      ))}
    </div>
  )
}
