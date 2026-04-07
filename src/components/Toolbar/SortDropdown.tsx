// ============================================================
// 排序下拉框组件
// 提供两类排序：
// 1. 项目排序：按更新时间/启动时间/名称，可选正序/倒序
// 2. 卡片排序：按时间正序/倒序（默认最新在前）
// ============================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpDown, Check, ChevronUp, ChevronDown, Layers, CreditCard } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'

/** 项目排序方式选项 */
const PROJECT_SORT_OPTIONS = [
  { value: 'updated' as const, label: '按更新时间' },
  { value: 'started' as const, label: '按启动时间' },
  { value: 'name' as const, label: '按名称排序' }
]

export default function SortDropdown() {
  const { sortType, setSortType, sortOrder, setSortOrder, cardSortOrder, setCardSortOrder } = useUIStore()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <motion.button
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        title="排序方式"
      >
        <ArrowUpDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <span className="text-xs text-gray-500 dark:text-gray-400 hidden xl:inline">排序</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* 点击外部关闭 */}
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              className="absolute top-full left-0 mt-1 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden z-20 min-w-[200px]"
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              {/* 项目排序分组 */}
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Layers className="w-3 h-3 text-purple-500" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">项目排序</span>
                </div>
                {PROJECT_SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-md transition-colors text-left"
                    onClick={() => setSortType(opt.value)}
                  >
                    <Check className={`w-3 h-3 ${sortType === opt.value ? 'text-blue-500' : 'text-transparent'}`} />
                    <span className={sortType === opt.value ? 'text-blue-500 font-medium' : 'text-gray-600 dark:text-gray-300'}>
                      {opt.label}
                    </span>
                  </button>
                ))}
                {/* 正序/倒序切换 */}
                <div className="flex items-center gap-1 mt-1.5 px-2">
                  <button
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors ${
                      sortOrder === 'desc'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 font-medium'
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                    onClick={() => setSortOrder('desc')}
                  >
                    <ChevronDown className="w-3 h-3" />
                    倒序
                  </button>
                  <button
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors ${
                      sortOrder === 'asc'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 font-medium'
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                    onClick={() => setSortOrder('asc')}
                  >
                    <ChevronUp className="w-3 h-3" />
                    正序
                  </button>
                </div>
              </div>

              {/* 卡片排序分组 */}
              <div className="px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <CreditCard className="w-3 h-3 text-green-500" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">卡片排序</span>
                </div>
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-md transition-colors text-left"
                  onClick={() => setCardSortOrder('newest')}
                >
                  <Check className={`w-3 h-3 ${cardSortOrder === 'newest' ? 'text-blue-500' : 'text-transparent'}`} />
                  <span className={cardSortOrder === 'newest' ? 'text-blue-500 font-medium' : 'text-gray-600 dark:text-gray-300'}>
                    最新在前
                  </span>
                </button>
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-md transition-colors text-left"
                  onClick={() => setCardSortOrder('oldest')}
                >
                  <Check className={`w-3 h-3 ${cardSortOrder === 'oldest' ? 'text-blue-500' : 'text-transparent'}`} />
                  <span className={cardSortOrder === 'oldest' ? 'text-blue-500 font-medium' : 'text-gray-600 dark:text-gray-300'}>
                    最早在前
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
