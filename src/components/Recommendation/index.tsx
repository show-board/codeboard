// ============================================================
// 推荐任务组件
// 每次打开看板时显示推荐进入的项目
// ============================================================

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronRight, X } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useSettingsStore } from '../../stores/settingsStore'

interface RecommendationItem {
  project_id: string
  project_name: string
  color: string
  reason: string
  priority: number
}

export default function Recommendation() {
  const show = useUIStore(s => s.showRecommendations)
  const setShow = useUIStore(s => s.setShowRecommendations)
  const setScrollToProject = useUIStore(s => s.setScrollToProject)
  const { host, port } = useSettingsStore()
  const [items, setItems] = useState<RecommendationItem[]>([])

  // 加载推荐
  useEffect(() => {
    if (!show) return
    fetch(`http://${host}:${port}/api/recommendations`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          // 从各分类中提取推荐
          const recs: RecommendationItem[] = []
          const seen = new Set<string>()
          for (const item of (data.data.activeSessions || [])) {
            if (!seen.has(item.project_id)) {
              seen.add(item.project_id)
              recs.push({
                project_id: item.project_id,
                project_name: item.name,
                color: item.color,
                reason: `正在运行: ${item.goal?.substring(0, 40) || '进行中'}`,
                priority: 1
              })
            }
          }
          for (const item of (data.data.staleProjects || [])) {
            if (!seen.has(item.project_id)) {
              seen.add(item.project_id)
              recs.push({
                project_id: item.project_id,
                project_name: item.name,
                color: item.color,
                reason: '已超过 24h 未更新',
                priority: 3
              })
            }
          }
          setItems(recs)
        }
      })
      .catch(() => {})
  }, [show, host, port])

  if (!show || items.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        className="absolute top-14 right-4 z-30 w-72"
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
      >
        <div className="bg-white/95 dark:bg-neutral-800/95 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/30 dark:border-gray-700/30 overflow-hidden">
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">推荐关注</span>
            </div>
            <button
              className="p-1 rounded-md hover:bg-gray-200/50 dark:hover:bg-gray-600/50"
              onClick={() => setShow(false)}
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          {/* 推荐列表 */}
          <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto scroll-y-smooth">
            {items.map((item, i) => (
              <motion.button
                key={item.project_id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => { setScrollToProject(item.project_id); setShow(false) }}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{item.project_name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{item.reason}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
