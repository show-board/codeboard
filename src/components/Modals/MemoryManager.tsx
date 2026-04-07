// ============================================================
// 记忆管理界面
// 全屏弹窗，展示项目记忆的分类列表和文档内容
// 支持查看、编辑记忆文档
// ============================================================

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Brain, FolderOpen, FileText, ChevronRight, Eye, Code } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useUIStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { useSettingsStore } from '../../stores/settingsStore'
import GlassCard from '../common/GlassCard'
import BlurOverlay from '../common/BlurOverlay'

interface Category {
  id: number
  name: string
  description: string
  sort_order: number
}

interface Document {
  id: number
  title: string
  file_path: string
  updated_at: string
}

export default function MemoryManager() {
  const projectId = useUIStore(s => s.showMemoryManager)
  const setShowMemoryManager = useUIStore(s => s.setShowMemoryManager)
  const projects = useProjectStore(s => s.projects)
  const { host, port } = useSettingsStore()

  const [categories, setCategories] = useState<Category[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [docContent, setDocContent] = useState('')
  const [loading, setLoading] = useState(false)
  // 预览模式：true 为 Markdown 渲染，false 为源码
  const [previewMode, setPreviewMode] = useState(true)

  const project = projects.find(p => p.project_id === projectId)
  const baseUrl = `http://${host}:${port}`

  // 加载记忆分类
  useEffect(() => {
    if (!projectId) return
    fetch(`${baseUrl}/api/memories/${projectId}/categories`)
      .then(r => r.json())
      .then(data => { if (data.success) setCategories(data.data) })
      .catch(console.error)
  }, [projectId, baseUrl])

  // 加载选中分类的文档
  useEffect(() => {
    if (!projectId || selectedCategory === null) return
    fetch(`${baseUrl}/api/memories/${projectId}/documents?category_id=${selectedCategory}`)
      .then(r => r.json())
      .then(data => { if (data.success) setDocuments(data.data) })
      .catch(console.error)
  }, [projectId, selectedCategory, baseUrl])

  /** 加载文档内容 */
  const loadDocument = async (doc: Document) => {
    setSelectedDoc(doc)
    setLoading(true)
    try {
      const res = await fetch(`${baseUrl}/api/memories/${projectId}/documents/${doc.id}`)
      const data = await res.json()
      if (data.success) {
        setDocContent(data.data.content || '')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!projectId) return null

  return (
    <AnimatePresence>
      {projectId && (
        <>
          <BlurOverlay onClick={() => setShowMemoryManager(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
            <GlassCard modal className="w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col pointer-events-auto">
              {/* 头部 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-purple-500" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">项目记忆管理</h2>
                    <p className="text-xs text-gray-500">{project?.name || projectId}</p>
                  </div>
                </div>
                <button
                  className="p-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-600/50"
                  onClick={() => setShowMemoryManager(null)}
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* 主体：三栏布局 */}
              <div className="flex-1 flex overflow-hidden">
                {/* 左栏：分类列表 */}
                <div className="w-56 border-r border-gray-200/50 dark:border-gray-700/50 overflow-y-auto scroll-y-smooth p-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">记忆分类</h3>
                  <div className="space-y-1">
                    {categories.map(cat => (
                      <motion.button
                        key={cat.id}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                          selectedCategory === cat.id
                            ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                        }`}
                        whileHover={{ x: 2 }}
                        onClick={() => { setSelectedCategory(cat.id); setSelectedDoc(null) }}
                      >
                        <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{cat.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{cat.description}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* 中栏：文档列表 */}
                <div className="w-56 border-r border-gray-200/50 dark:border-gray-700/50 overflow-y-auto scroll-y-smooth p-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">文档</h3>
                  {selectedCategory === null ? (
                    <p className="text-xs text-gray-400 text-center py-8">请选择一个分类</p>
                  ) : documents.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-8">该分类暂无文档</p>
                  ) : (
                    <div className="space-y-1">
                      {documents.map(doc => (
                        <motion.button
                          key={doc.id}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                            selectedDoc?.id === doc.id
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                          }`}
                          whileHover={{ x: 2 }}
                          onClick={() => loadDocument(doc)}
                        >
                          <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{doc.title}</p>
                            <p className="text-[10px] text-gray-400">{new Date(doc.updated_at).toLocaleDateString('zh-CN')}</p>
                          </div>
                          <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 右栏：文档内容 */}
                <div className="flex-1 overflow-y-auto scroll-y-smooth p-4">
                  {!selectedDoc ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-gray-400">选择一个文档查看内容</p>
                    </div>
                  ) : loading ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-gray-400">加载中...</p>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col">
                      {/* 文档标题 + 预览/源码切换 */}
                      <div className="flex items-center justify-between mb-3 shrink-0">
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">{selectedDoc.title}</h3>
                        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                          <button
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                              previewMode ? 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 shadow-sm' : 'text-gray-500 dark:text-gray-400'
                            }`}
                            onClick={() => setPreviewMode(true)}
                          >
                            <Eye className="w-3 h-3" /> 预览
                          </button>
                          <button
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                              !previewMode ? 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 shadow-sm' : 'text-gray-500 dark:text-gray-400'
                            }`}
                            onClick={() => setPreviewMode(false)}
                          >
                            <Code className="w-3 h-3" /> 源码
                          </button>
                        </div>
                      </div>

                      {/* 内容区：Markdown 预览或纯文本源码 */}
                      <div className="flex-1 overflow-y-auto scroll-y-smooth">
                        {!docContent ? (
                          <p className="text-sm text-gray-400">（文档内容为空）</p>
                        ) : previewMode ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-gray-800 dark:prose-headings:text-gray-200 prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-code:text-violet-600 dark:prose-code:text-violet-400 prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:rounded-xl prose-a:text-blue-500 prose-strong:text-gray-700 dark:prose-strong:text-gray-200 prose-li:text-gray-600 dark:prose-li:text-gray-300 prose-table:text-xs">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {docContent}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <pre className="whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 font-mono leading-relaxed">
                            {docContent}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
