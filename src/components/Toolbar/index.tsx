// ============================================================
// 顶部功能区
// 左侧: 全部项目、排序、垃圾篓图标 (宽度 0-50%)
// 右侧: 时间过滤选择器
// ============================================================

import { motion } from 'framer-motion'
import { LayoutGrid, Trash2, Clock } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import SortDropdown from './SortDropdown'

const TIME_FILTERS = [
  { value: 'all' as const, label: '全部' },
  { value: 'recent' as const, label: '近期' },
  { value: 'yesterday_today' as const, label: '昨今' },
  { value: 'today' as const, label: '今日' }
]

export default function Toolbar() {
  const { setShowAllProjects, setShowTrashBin, timeFilter, setTimeFilter } = useUIStore()

  return (
    <div className="flex items-center h-full px-4 gap-2">
      {/* 左侧功能按钮 */}
      <div className="flex items-center gap-1">
        {/* 全部项目 */}
        <motion.button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAllProjects(true)}
          title="全部项目"
        >
          <LayoutGrid className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden xl:inline">全部项目</span>
        </motion.button>

        {/* 排序 */}
        <SortDropdown />

        {/* 垃圾篓 */}
        <motion.button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowTrashBin(true)}
          title="垃圾篓"
        >
          <Trash2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden xl:inline">垃圾篓</span>
        </motion.button>
      </div>

      {/* 分隔线 */}
      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

      {/* 时间过滤器 */}
      <div className="flex items-center gap-0.5">
        <Clock className="w-3.5 h-3.5 text-gray-400 mr-1" />
        {TIME_FILTERS.map(f => (
          <motion.button
            key={f.value}
            className={`px-2 py-1 rounded-md text-[11px] transition-colors ${
              timeFilter === f.value
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTimeFilter(f.value)}
          >
            {f.label}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
