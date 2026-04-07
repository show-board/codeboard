// ============================================================
// API 详情按钮及弹窗
// 点击后弹出毛玻璃卡片，列出所有 API 地址及 JSON 格式
// ============================================================

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, ChevronRight, X, Copy, Check } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useUIStore } from '../../stores/uiStore'
import GlassCard from '../common/GlassCard'
import BlurOverlay from '../common/BlurOverlay'

/** API 文档组定义 */
interface ApiGroup {
  group: string
  apis: {
    method: string
    path: string
    description: string
    body?: Record<string, string>
  }[]
}

export default function ApiDetail() {
  const { showApiDetail, setShowApiDetail } = useUIStore()
  const { host, port } = useSettingsStore()
  const [apiDocs, setApiDocs] = useState<ApiGroup[]>([])
  const [expandedApi, setExpandedApi] = useState<string | null>(null)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  // 加载 API 文档
  useEffect(() => {
    if (showApiDetail) {
      fetch(`http://${host}:${port}/api/docs`)
        .then(r => r.json())
        .then(data => {
          if (data.success) setApiDocs(data.data)
        })
        .catch(console.error)
    }
  }, [showApiDetail, host, port])

  /** 复制 API 地址 */
  const copyPath = (path: string) => {
    navigator.clipboard.writeText(`http://${host}:${port}${path}`)
    setCopiedPath(path)
    setTimeout(() => setCopiedPath(null), 2000)
  }

  /** 方法颜色映射 */
  const methodColor: Record<string, string> = {
    GET: 'text-green-500 bg-green-50 dark:bg-green-900/20',
    POST: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    PUT: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
    PATCH: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
    DELETE: 'text-red-500 bg-red-50 dark:bg-red-900/20'
  }

  return (
    <>
      {/* 触发按钮 */}
      <div className="px-4 py-3 border-t border-gray-200/50 dark:border-gray-700/50">
        <motion.button
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-100/50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setShowApiDetail(true)}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">API 详情</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
        </motion.button>
      </div>

      {/* 使用 Portal 将弹窗渲染到 body，避免 Sidebar 的 backdrop-blur 创建新的定位上下文 */}
      {createPortal(
        <AnimatePresence>
          {showApiDetail && (
            <>
              <BlurOverlay onClick={() => setShowApiDetail(false)} />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
                <GlassCard
                  modal
                  className="w-[90vw] max-w-5xl h-[85vh] overflow-hidden flex flex-col pointer-events-auto"
                >
                  {/* 头部 */}
                  <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200/50 dark:border-gray-700/50 shrink-0">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">API 接口文档</h2>
                      <p className="text-sm text-gray-500 mt-1 font-mono">http://{host}:{port}</p>
                    </div>
                    <button
                      className="p-2 rounded-xl hover:bg-gray-200/50 dark:hover:bg-gray-600/50 transition-colors"
                      onClick={() => setShowApiDetail(false)}
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  {/* 内容区 —— 全屏宽敞布局 */}
                  <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
                    {apiDocs.map(group => (
                      <div key={group.group}>
                        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                          <span className="w-1.5 h-5 rounded-full bg-blue-500 inline-block" />
                          {group.group}
                        </h3>
                        <div className="space-y-2">
                          {group.apis.map(api => {
                            const key = `${api.method}-${api.path}`
                            const isExpanded = expandedApi === key
                            return (
                              <motion.div key={key} layout className="rounded-xl overflow-hidden bg-gray-50/50 dark:bg-gray-800/30">
                                {/* API 条目：两行布局（方法+路径 / 描述） */}
                                <div
                                  className="px-5 py-3 cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
                                  onClick={() => setExpandedApi(isExpanded ? null : key)}
                                >
                                  <div className="flex items-center gap-3 mb-1">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg min-w-[60px] text-center shrink-0 ${methodColor[api.method] || ''}`}>
                                      {api.method}
                                    </span>
                                    <span className="text-sm font-mono text-gray-700 dark:text-gray-200 flex-1 break-all">{api.path}</span>
                                    <button
                                      className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shrink-0"
                                      onClick={e => { e.stopPropagation(); copyPath(api.path) }}
                                    >
                                      {copiedPath === api.path
                                        ? <Check className="w-3.5 h-3.5 text-green-500" />
                                        : <Copy className="w-3.5 h-3.5 text-gray-400" />
                                      }
                                    </button>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-[76px]">{api.description}</p>
                                </div>

                                <AnimatePresence>
                                  {isExpanded && api.body && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="px-5 pb-4"
                                    >
                                      <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-5 overflow-x-auto">
                                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-3">Request Body</p>
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="text-left text-gray-500 dark:text-gray-400">
                                              <th className="pb-2 pr-6 font-medium">字段</th>
                                              <th className="pb-2 font-medium">类型 / 说明</th>
                                            </tr>
                                          </thead>
                                          <tbody className="font-mono">
                                            {Object.entries(api.body).map(([field, desc]) => (
                                              <tr key={field} className="border-t border-gray-200/50 dark:border-gray-700/50">
                                                <td className="py-2 pr-6 text-gray-700 dark:text-gray-200 font-semibold whitespace-nowrap">{field}</td>
                                                <td className="py-2 text-gray-500 dark:text-gray-400">{desc}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
