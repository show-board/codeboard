// ============================================================
// 状态徽章组件
// 显示任务/Session 状态（排队中、运行中、已完成）的彩色标签
// ============================================================

import { motion } from 'framer-motion'

interface StatusBadgeProps {
  status: 'queued' | 'running' | 'completed' | string
  size?: 'sm' | 'md'
}

/** 状态对应的颜色和文字 */
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; hint: string }> = {
  queued: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    label: '排队中',
    hint: '⏳ 耐心等待...'
  },
  running: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    label: '运行中',
    hint: '⚡ 执行中'
  },
  completed: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    label: '已完成',
    hint: '✅ 完成'
  }
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.queued
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'

  return (
    <motion.span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bg} ${config.text} ${sizeClass}`}
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      title={config.hint}
    >
      {/* 运行中状态显示呼吸动画圆点 */}
      {status === 'running' && (
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-blue-500"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      {config.label}
    </motion.span>
  )
}
