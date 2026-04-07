// ============================================================
// 全部项目弹窗
// 显示所有项目（含隐藏的），每个小卡片可勾选是否在看板中显示
// ============================================================

import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Eye, EyeOff } from 'lucide-react'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import GlassCard from '../common/GlassCard'
import BlurOverlay from '../common/BlurOverlay'

export default function AllProjects() {
  const show = useUIStore(s => s.showAllProjects)
  const setShow = useUIStore(s => s.setShowAllProjects)
  const projects = useProjectStore(s => s.projects)
  const restoreProject = useProjectStore(s => s.restoreProject)
  const hideProject = useProjectStore(s => s.hideProject)

  // 筛选出非垃圾篓的项目
  const availableProjects = projects.filter(p => p.status !== 'trashed')

  return (
    <AnimatePresence>
      {show && (
        <>
          <BlurOverlay onClick={() => setShow(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 pointer-events-none">
            <GlassCard modal className="w-full max-w-xl max-h-[70vh] overflow-hidden flex flex-col pointer-events-auto">
              {/* 头部 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">全部项目</h2>
                <button
                  className="p-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-600/50"
                  onClick={() => setShow(false)}
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* 项目列表 */}
              <div className="flex-1 overflow-y-auto p-4 scroll-y-smooth">
                {availableProjects.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">暂无项目</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {availableProjects.map(project => {
                      const isVisible = project.status === 'visible'
                      return (
                        <motion.div
                          key={project.project_id}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                            isVisible
                              ? 'bg-white dark:bg-neutral-700 border-gray-200/50 dark:border-gray-600/50'
                              : 'bg-gray-50 dark:bg-neutral-800 border-gray-200/30 dark:border-gray-700/30 opacity-60'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => isVisible ? hideProject(project.project_id) : restoreProject(project.project_id)}
                        >
                          {/* 颜色标记 */}
                          <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />

                          {/* 项目名称 */}
                          <span className="text-sm text-gray-700 dark:text-gray-200 flex-1 truncate">
                            {project.name}
                          </span>

                          {/* 显示/隐藏图标 */}
                          <motion.div
                            className={`p-1 rounded-md ${isVisible ? 'text-green-500' : 'text-gray-400'}`}
                            whileHover={{ scale: 1.1 }}
                          >
                            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </motion.div>
                        </motion.div>
                      )
                    })}
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
