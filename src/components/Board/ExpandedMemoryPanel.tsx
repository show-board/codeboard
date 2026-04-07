// ============================================================
// 放大模式：右半区域记忆展示面板
// 直接展示项目所有记忆文档，支持分类导航 + 文档内容浏览
// ============================================================

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, FolderOpen, FileText, ChevronRight, Eye, Code } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useSettingsStore } from '../../stores/settingsStore'

interface Category {
  id: number
  name: string
  description: string
}

interface Document {
  id: number
  title: string
  file_path: string
  updated_at: string
}

interface Props {
  projectId: string
  projectName: string
}

export default function ExpandedMemoryPanel({ projectId, projectName }: Props) {
  const { host, port } = useSettingsStore()
  const baseUrl = `http://${host}:${port}`

  const [categories, setCategories] = useState<Category[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [docContent, setDocContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState(true)

  // 加载记忆分类
  useEffect(() => {
    fetch(`${baseUrl}/api/memories/${projectId}/categories`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.length > 0) {
          setCategories(data.data)
          // 默认选中第一个分类
          setSelectedCategory(data.data[0].id)
        }
      })
      .catch(console.error)
  }, [projectId, baseUrl])

  // 加载选中分类的文档
  useEffect(() => {
    if (selectedCategory === null) return
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
      if (data.success) setDocContent(data.data.content || '')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white/30 dark:bg-neutral-800/30 backdrop-blur-sm">
      {/* 头部 */}
      <div className="px-5 py-3 border-b border-gray-200/50 dark:border-gray-700/50 shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {projectName} — 项目记忆
          </h3>
        </div>
      </div>

      {/* 主体 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：分类 + 文档导航 */}
        <div className="w-52 border-r border-gray-200/50 dark:border-gray-700/50 overflow-y-auto p-2 shrink-0 column-scroll">
          {/* 分类列表 */}
          {categories.map(cat => (
            <div key={cat.id}>
              <motion.button
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors mb-0.5 ${
                  selectedCategory === cat.id
                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-medium'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                }`}
                whileHover={{ x: 1 }}
                onClick={() => { setSelectedCategory(cat.id); setSelectedDoc(null); setDocContent('') }}
              >
                <FolderOpen className="w-3 h-3 shrink-0" />
                <span className="truncate">{cat.name}</span>
              </motion.button>

              {/* 选中分类时展开该分类下的文档 */}
              {selectedCategory === cat.id && documents.length > 0 && (
                <div className="ml-3 mb-1">
                  {documents.map(doc => (
                    <motion.button
                      key={doc.id}
                      className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left text-[11px] transition-colors ${
                        selectedDoc?.id === doc.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400'
                      }`}
                      whileHover={{ x: 1 }}
                      onClick={() => loadDocument(doc)}
                    >
                      <FileText className="w-3 h-3 shrink-0" />
                      <span className="truncate">{doc.title}</span>
                      <ChevronRight className="w-2.5 h-2.5 ml-auto shrink-0 opacity-40" />
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {categories.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">暂无记忆分类</p>
          )}
        </div>

        {/* 右侧：文档内容 */}
        <div className="flex-1 overflow-y-auto p-4 column-scroll">
          {!selectedDoc ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Brain className="w-10 h-10 text-gray-200 dark:text-gray-700" />
              <p className="text-xs text-gray-400">选择左侧文档查看记忆内容</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* 文档标题 + 预览/源码切换 */}
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedDoc.title}</h4>
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                  <button
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                      previewMode ? 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 shadow-sm' : 'text-gray-500'
                    }`}
                    onClick={() => setPreviewMode(true)}
                  >
                    <Eye className="w-3 h-3" /> 预览
                  </button>
                  <button
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                      !previewMode ? 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 shadow-sm' : 'text-gray-500'
                    }`}
                    onClick={() => setPreviewMode(false)}
                  >
                    <Code className="w-3 h-3" /> 源码
                  </button>
                </div>
              </div>

              {/* 文档正文 */}
              <div className="flex-1 overflow-y-auto column-scroll">
                {!docContent ? (
                  <p className="text-xs text-gray-400">（文档内容为空）</p>
                ) : previewMode ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-gray-800 dark:prose-headings:text-gray-200 prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-code:text-violet-600 dark:prose-code:text-violet-400 prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:rounded-xl prose-a:text-blue-500 prose-table:text-xs">
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
    </div>
  )
}
