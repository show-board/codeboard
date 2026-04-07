// ============================================================
// 项目详情弹窗
// 点击项目名称后弹出，显示项目信息及记忆管理入口
// ============================================================

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Palette, Brain } from 'lucide-react'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import GlassCard from '../common/GlassCard'
import BlurOverlay from '../common/BlurOverlay'

/** 预设颜色选择器 */
const PRESET_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE',
  '#FF2D55', '#5856D6', '#00C7BE', '#30B0C7', '#A2845E'
]

export default function ProjectDetail() {
  const projectId = useUIStore(s => s.showProjectDetail)
  const setShowProjectDetail = useUIStore(s => s.setShowProjectDetail)
  const setShowMemoryManager = useUIStore(s => s.setShowMemoryManager)
  const projects = useProjectStore(s => s.projects)
  const changeProjectColor = useProjectStore(s => s.changeProjectColor)
  const [showColorPicker, setShowColorPicker] = useState(false)

  const project = projects.find(p => p.project_id === projectId)

  if (!projectId || !project) return null

  const formatDate = (str: string) => {
    const d = new Date(str)
    return d.toLocaleString('zh-CN')
  }

  return (
    <AnimatePresence>
      {projectId && (
        <>
          <BlurOverlay onClick={() => setShowProjectDetail(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 pointer-events-none">
            <GlassCard modal className="w-full max-w-md pointer-events-auto">
              {/* 头部色条 */}
              <div className="h-2 rounded-t-[20px]" style={{ backgroundColor: project.color }} />

              <div className="p-6">
                {/* 关闭按钮 */}
                <div className="flex justify-end -mt-2 -mr-2">
                  <button
                    className="p-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-600/50"
                    onClick={() => setShowProjectDetail(null)}
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {/* 项目名称 */}
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">{project.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{project.description || '暂无描述'}</p>

                {/* 信息列表 */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">项目 ID</span>
                    <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{project.project_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">创建时间</span>
                    <span className="text-gray-700 dark:text-gray-300">{formatDate(project.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">最后更新</span>
                    <span className="text-gray-700 dark:text-gray-300">{formatDate(project.updated_at)}</span>
                  </div>
                  {/* 颜色设置 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">专属色</span>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full border" style={{ backgroundColor: project.color }} />
                      <button
                        className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                      >
                        <Palette className="w-3 h-3" />
                        修改
                      </button>
                    </div>
                  </div>
                </div>

                {/* 颜色选择器 */}
                <AnimatePresence>
                  {showColorPicker && (
                    <motion.div
                      className="flex gap-2 flex-wrap mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      {PRESET_COLORS.map(c => (
                        <motion.button
                          key={c}
                          className={`w-7 h-7 rounded-full border-2 ${c === project.color ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => { changeProjectColor(project.project_id, c); setShowColorPicker(false) }}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 记忆管理按钮 */}
                <motion.button
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => { setShowProjectDetail(null); setShowMemoryManager(project.project_id) }}
                >
                  <Brain className="w-4 h-4" />
                  项目记忆管理
                </motion.button>
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
