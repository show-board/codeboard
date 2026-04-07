// ============================================================
// 任务列表组件
// 在 Session 卡片中显示各任务的状态
// ============================================================

import { motion } from 'framer-motion'

interface TaskItem {
  name: string
  status: string
}

interface TaskListProps {
  tasks: TaskItem[]
}

export default function TaskList({ tasks }: TaskListProps) {
  if (!tasks || tasks.length === 0) return null

  /** 状态图标和颜色 */
  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return { icon: '✓', color: 'text-green-500', bg: 'bg-green-500' }
      case 'running': return { icon: '▶', color: 'text-blue-500', bg: 'bg-blue-500' }
      default: return { icon: '○', color: 'text-gray-400', bg: 'bg-gray-300' }
    }
  }

  return (
    <div className="space-y-1">
      {tasks.map((task, i) => {
        const st = statusIcon(task.status)
        return (
          <motion.div
            key={i}
            className="flex items-center gap-2 text-[11px]"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            {/* 状态指示圆点 */}
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.bg} ${task.status === 'running' ? 'animate-pulse' : ''}`} />
            <span className={`truncate ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-600 dark:text-gray-300'}`}>
              {task.name}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
