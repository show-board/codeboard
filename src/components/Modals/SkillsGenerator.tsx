// ============================================================
// Skills 模板生成弹窗
// 展示两个子文件夹：rules/（规则配置） + skills/（SKILL.md + references + scripts）
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

/** 文件夹定义（用于动态渲染目录树） */
interface FolderDef {
  prefix: string
  label: string
  icon: typeof FolderOpen
  iconColor: string
  activeColor: string
  activeBg: string
}

export default function SkillsGenerator() {
  const { showSkillsGenerator, setShowSkillsGenerator } = useUIStore()
  const [files, setFiles] = useState<SkillFile[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<SkillFile | null>(null)
  const [copied, setCopied] = useState(false)
  const [savedPath, setSavedPath] = useState<string | null>(null)
  // 各个文件夹的展开/折叠状态
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'rules/': true,
    'skills/codeboard/': true,
    'skills/codeboard/references/': true,
    'skills/codeboard/scripts/': true,
    'skills/codeboard-cursor/': true,
    'skills/codeboard-claudecode/': false,
    'skills/codeboard-openclaw/': false,
    'hooks/cursor/': true,
    'hooks/claudecode/': false,
    'hooks/openclaw/': false,
  })

  const toggleFolder = (key: string) => {
    setExpandedFolders(prev => ({ ...prev, [key]: !prev[key] }))
  }

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
          const main = result.files.find(f => f.path === 'skills/codeboard/SKILL.md')
          setSelectedFile(main || result.files[0])
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [showSkillsGenerator])

  const handleCopy = () => {
    if (!selectedFile) return
    navigator.clipboard.writeText(selectedFile.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveBundle = async () => {
    const bundleFiles = files.map(f => ({ path: f.path, content: f.content }))
    const result = await window.codeboard.saveSkillsBundle(bundleFiles)
    if (result.success && result.path) {
      setSavedPath(result.path)
    }
  }

  // 按前缀分组
  const rulesFiles = files.filter(f => f.path.startsWith('rules/'))
  const skillMainFiles = files.filter(f => f.path.startsWith('skills/codeboard/') && !f.path.includes('/references/') && !f.path.includes('/scripts/'))
  const refFiles = files.filter(f => f.path.startsWith('skills/codeboard/references/'))
  const scriptFiles = files.filter(f => f.path.startsWith('skills/codeboard/scripts/'))
  const cursorSkillFiles = files.filter(f => f.path.startsWith('skills/codeboard-cursor/'))
  const ccSkillFiles = files.filter(f => f.path.startsWith('skills/codeboard-claudecode/'))
  const ocSkillFiles = files.filter(f => f.path.startsWith('skills/codeboard-openclaw/'))
  // hooks 文件夹
  const hooksCursorFiles = files.filter(f => f.path.startsWith('hooks/cursor/'))
  const hooksCCFiles = files.filter(f => f.path.startsWith('hooks/claudecode/'))
  const hooksOCFiles = files.filter(f => f.path.startsWith('hooks/openclaw/'))

  /** 渲染单个文件按钮 */
  const renderFileItem = (file: SkillFile, indent: number, activeColor: string, activeBg: string) => (
    <motion.button
      key={file.path}
      className={`w-full flex items-center gap-2 pr-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
        selectedFile?.path === file.path
          ? `${activeBg} ${activeColor} font-medium`
          : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400'
      }`}
      style={{ paddingLeft: `${indent}px` }}
      whileHover={{ x: 1 }}
      onClick={() => setSelectedFile(file)}
    >
      <FileText className="w-3 h-3 shrink-0" />
      <span className="truncate">{file.name}</span>
    </motion.button>
  )

  /** 渲染可折叠文件夹 */
  const renderFolder = (
    key: string, label: string, items: SkillFile[],
    indent: number, iconColor: string, activeColor: string, activeBg: string
  ) => {
    if (items.length === 0) return null
    const expanded = expandedFolders[key] ?? true
    return (
      <>
        <button
          className="w-full flex items-center gap-1.5 pr-2 py-1.5 rounded-lg text-left text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          style={{ paddingLeft: `${indent}px` }}
          onClick={() => toggleFolder(key)}
        >
          {expanded
            ? <ChevronDown className="w-3 h-3 shrink-0" />
            : <ChevronRight className="w-3 h-3 shrink-0" />
          }
          <FolderOpen className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />
          <span>{label}</span>
          <span className="ml-auto text-[10px] text-gray-400">{items.length}</span>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {items.map(f => renderFileItem(f, indent + 16, activeColor, activeBg))}
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  }

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
                      包含 rules（{rulesFiles.length}）、skills（{skillMainFiles.length + refFiles.length + scriptFiles.length + cursorSkillFiles.length + ccSkillFiles.length + ocSkillFiles.length}）、hooks（{hooksCursorFiles.length + hooksCCFiles.length + hooksOCFiles.length}）
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
                  点击「保存目录」后将创建 <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-purple-600 dark:text-purple-400">codeboard/</code> 目录，
                  内含 <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-green-600 dark:text-green-400">rules/</code>（规则配置）、
                  <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">skills/</code>（SKILL.md + references + scripts）和
                  <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-purple-600 dark:text-purple-400">hooks/</code>（Cursor / Claude Code / OpenClaw hooks 配置）三个子文件夹。
                </p>
              </div>

              {/* 主体：左侧文件树 + 右侧内容预览 */}
              <div className="flex-1 flex overflow-hidden">
                {/* 左侧文件树 */}
                <div className="w-64 border-r border-gray-200/50 dark:border-gray-700/50 overflow-y-auto p-3 shrink-0">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
                    </div>
                  ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      <p className="text-xs text-gray-400">未找到 Skills 文件</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {/* 根目录标题 */}
                      <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        <FolderOpen className="w-3.5 h-3.5 text-purple-500" />
                        <span>codeboard/</span>
                      </div>

                      {/* 文件夹1: rules/ — 规则配置 */}
                      {renderFolder(
                        'rules/', 'rules/', rulesFiles,
                        16, 'text-green-500',
                        'text-green-600 dark:text-green-400',
                        'bg-green-50 dark:bg-green-900/20'
                      )}

                      {/* 文件夹2: skills/ */}
                      {renderFolder(
                        'skills/codeboard/', 'skills/codeboard/', skillMainFiles,
                        16, 'text-blue-500',
                        'text-blue-600 dark:text-blue-400',
                        'bg-blue-50 dark:bg-blue-900/20'
                      )}
                      {renderFolder(
                        'skills/codeboard/references/', 'references/', refFiles,
                        32, 'text-indigo-500',
                        'text-indigo-600 dark:text-indigo-400',
                        'bg-indigo-50 dark:bg-indigo-900/20'
                      )}
                      {renderFolder(
                        'skills/codeboard/scripts/', 'scripts/', scriptFiles,
                        32, 'text-orange-500',
                        'text-orange-600 dark:text-orange-400',
                        'bg-orange-50 dark:bg-orange-900/20'
                      )}
                      {renderFolder(
                        'skills/codeboard-cursor/', 'codeboard-cursor/', cursorSkillFiles,
                        16, 'text-cyan-500',
                        'text-cyan-600 dark:text-cyan-400',
                        'bg-cyan-50 dark:bg-cyan-900/20'
                      )}
                      {renderFolder(
                        'skills/codeboard-claudecode/', 'codeboard-claudecode/', ccSkillFiles,
                        16, 'text-sky-500',
                        'text-sky-600 dark:text-sky-400',
                        'bg-sky-50 dark:bg-sky-900/20'
                      )}
                      {renderFolder(
                        'skills/codeboard-openclaw/', 'codeboard-openclaw/', ocSkillFiles,
                        16, 'text-teal-500',
                        'text-teal-600 dark:text-teal-400',
                        'bg-teal-50 dark:bg-teal-900/20'
                      )}

                      {/* 文件夹3: hooks/ — 三种 Agent 的 hooks 配置模板 */}
                      {renderFolder(
                        'hooks/cursor/', 'hooks/cursor/', hooksCursorFiles,
                        16, 'text-purple-500',
                        'text-purple-600 dark:text-purple-400',
                        'bg-purple-50 dark:bg-purple-900/20'
                      )}
                      {renderFolder(
                        'hooks/claudecode/', 'hooks/claudecode/', hooksCCFiles,
                        16, 'text-blue-500',
                        'text-blue-600 dark:text-blue-400',
                        'bg-blue-50 dark:bg-blue-900/20'
                      )}
                      {renderFolder(
                        'hooks/openclaw/', 'hooks/openclaw/', hooksOCFiles,
                        16, 'text-emerald-500',
                        'text-emerald-600 dark:text-emerald-400',
                        'bg-emerald-50 dark:bg-emerald-900/20'
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
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-mono text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-md">
                          codeboard/{selectedFile.path}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {selectedFile.content.split('\n').length} 行
                        </span>
                      </div>
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
                    <span>共 {files.length} 个文件（{rulesFiles.length} 规则 + {files.length - rulesFiles.length} Skills）</span>
                  )}
                </div>
                <div className="flex gap-3">
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
