// ============================================================
// Skills 模板生成弹窗
// 展示完整 Skills 目录结构（SKILL.md + references/*.md）
// 支持文件树浏览、内容预览、一键保存完整目录到本地
// ============================================================

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, Download, Wand2, FileText, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import GlassCard from '../common/GlassCard'
import BlurOverlay from '../common/BlurOverlay'

/** 单个技能文件 */
interface SkillFile {
  path: string
  name: string
  content: string
}

export default function SkillsGenerator() {
  const { showSkillsGenerator, setShowSkillsGenerator } = useUIStore()
  const [files, setFiles] = useState<SkillFile[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<SkillFile | null>(null)
  const [copied, setCopied] = useState(false)
  const [savedPath, setSavedPath] = useState<string | null>(null)
  // references 目录展开/折叠
  const [refsExpanded, setRefsExpanded] = useState(true)

  // 通过 IPC 读取 Skills 文件包
  useEffect(() => {
    if (!showSkillsGenerator) return
    setLoading(true)
    setSavedPath(null)
    setCopied(false)
    setSelectedFile(null)

    window.codeboard.getSkillsBundle()
      .then(result => {
        if (result.success && result.files.length > 0) {
          setFiles(result.files)
          // 默认选中 SKILL.md
          const main = result.files.find(f => f.path === 'SKILL.md')
          setSelectedFile(main || result.files[0])
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [showSkillsGenerator])

  /** 复制当前文件内容到剪贴板 */
  const handleCopy = () => {
    if (!selectedFile) return
    navigator.clipboard.writeText(selectedFile.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /** 保存完整 Skills 目录到本地 */
  const handleSaveBundle = async () => {
    const bundleFiles = files.map(f => ({ path: f.path, content: f.content }))
    const result = await window.codeboard.saveSkillsBundle(bundleFiles)
    if (result.success && result.path) {
      setSavedPath(result.path)
    }
  }

  // 将文件列表分为主文件和 references
  const mainFile = files.find(f => f.path === 'SKILL.md')
  const refFiles = files.filter(f => f.path.startsWith('references/'))

  return (
    <AnimatePresence>
      {showSkillsGenerator && (
        <>
          <BlurOverlay onClick={() => setShowSkillsGenerator(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
            <GlassCard
              modal
              className="w-[90vw] max-w-5xl h-[85vh] overflow-hidden flex flex-col pointer-events-auto"
            >
              {/* 头部 */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200/50 dark:border-gray-700/50 shrink-0">
                <div className="flex items-center gap-3">
                  <Wand2 className="w-5 h-5 text-purple-500" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Skills 模板生成器</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      完整 Skills 目录，包含 SKILL.md 和 {refFiles.length} 个 reference 文件
                    </p>
                  </div>
                </div>
                <button
                  className="p-2 rounded-xl hover:bg-gray-200/50 dark:hover:bg-gray-600/50 transition-colors"
                  onClick={() => setShowSkillsGenerator(false)}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* 使用说明 */}
              <div className="px-8 py-3 bg-purple-50/50 dark:bg-purple-900/10 border-b border-gray-200/50 dark:border-gray-700/50 shrink-0">
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  将此 Skills 目录保存到 <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-purple-600 dark:text-purple-400">~/.cursor/skills/</code> 目录下，
                  Cursor Agent 将自动加载这些 Skills 与 CodeBoard 看板对接。点击「保存目录」会自动创建 <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-purple-600 dark:text-purple-400">codeboard/</code> 子目录。
                </p>
              </div>

              {/* 主体：左侧文件树 + 右侧内容预览 */}
              <div className="flex-1 flex overflow-hidden">
                {/* 左侧文件树 */}
                <div className="w-60 border-r border-gray-200/50 dark:border-gray-700/50 overflow-y-auto p-3 shrink-0">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
                    </div>
                  ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      <p className="text-xs text-gray-400">未找到 Skills 文件</p>
                      <p className="text-[10px] text-gray-400 text-center">请确认仓库 skills/codeboard/ 目录存在</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {/* 目录标题 */}
                      <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        <FolderOpen className="w-3.5 h-3.5 text-purple-500" />
                        <span>codeboard/</span>
                      </div>

                      {/* 主文件 SKILL.md */}
                      {mainFile && (
                        <motion.button
                          className={`w-full flex items-center gap-2 pl-6 pr-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                            selectedFile?.path === mainFile.path
                              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-medium'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                          }`}
                          whileHover={{ x: 1 }}
                          onClick={() => setSelectedFile(mainFile)}
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">SKILL.md</span>
                        </motion.button>
                      )}

                      {/* references/ 折叠目录 */}
                      {refFiles.length > 0 && (
                        <>
                          <button
                            className="w-full flex items-center gap-1.5 pl-4 pr-2 py-1.5 rounded-lg text-left text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                            onClick={() => setRefsExpanded(!refsExpanded)}
                          >
                            {refsExpanded
                              ? <ChevronDown className="w-3 h-3 shrink-0" />
                              : <ChevronRight className="w-3 h-3 shrink-0" />
                            }
                            <FolderOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>references/</span>
                            <span className="ml-auto text-[10px] text-gray-400">{refFiles.length}</span>
                          </button>

                          <AnimatePresence>
                            {refsExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                {refFiles.map(rf => (
                                  <motion.button
                                    key={rf.path}
                                    className={`w-full flex items-center gap-2 pl-10 pr-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                                      selectedFile?.path === rf.path
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                                    }`}
                                    whileHover={{ x: 1 }}
                                    onClick={() => setSelectedFile(rf)}
                                  >
                                    <FileText className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{rf.name}</span>
                                  </motion.button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 右侧内容预览 */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {!selectedFile ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-sm text-gray-400">选择左侧文件查看内容</p>
                    </div>
                  ) : (
                    <div>
                      {/* 文件路径标签 */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-mono text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-md">
                          codeboard/{selectedFile.path}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {selectedFile.content.split('\n').length} 行
                        </span>
                      </div>
                      {/* 文件内容 */}
                      <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                        {selectedFile.content}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* 底部操作栏 */}
              <div className="px-8 py-4 border-t border-gray-200/50 dark:border-gray-700/50 shrink-0 flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  {savedPath && (
                    <span className="text-green-500">已保存到: {savedPath}</span>
                  )}
                  {!savedPath && files.length > 0 && (
                    <span>共 {files.length} 个文件</span>
                  )}
                </div>
                <div className="flex gap-3">
                  {/* 复制当前文件内容 */}
                  <motion.button
                    className="flex items-center gap-2 px-4 py-2 text-xs rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCopy}
                    disabled={!selectedFile}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? '已复制' : '复制当前文件'}
                  </motion.button>
                  {/* 保存完整目录 */}
                  <motion.button
                    className="flex items-center gap-2 px-4 py-2 text-xs rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveBundle}
                    disabled={files.length === 0}
                  >
                    <Download className="w-3.5 h-3.5" />
                    保存目录到本地
                  </motion.button>
                </div>
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
