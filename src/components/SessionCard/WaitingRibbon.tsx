// ============================================================
// 期待卡片白条带子组件
// 任务完成后显示，模拟绑书的带子设计
// 点击带子弹出提示词输入，复制后显示锯齿裂纹效果
// ============================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clipboard, Check } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'

interface WaitingRibbonProps {
  sessionId: string
  existingPrompt?: string
}

export default function WaitingRibbon({ sessionId, existingPrompt }: WaitingRibbonProps) {
  const [cracked, setCracked] = useState(false)
  const [showInput, setShowInput] = useState(false)
  const [promptText, setPromptText] = useState(existingPrompt || '')
  const updatePromptText = useProjectStore(s => s.updatePromptText)

  /** 点击带子：弹出输入框 */
  const handleRibbonClick = () => {
    setShowInput(true)
  }

  /** 复制提示词到剪贴板 */
  const handleClip = async () => {
    if (promptText.trim()) {
      await navigator.clipboard.writeText(promptText)
      await updatePromptText(sessionId, promptText)
      setCracked(true)
      // 裂纹效果持续 2 秒后恢复
      setTimeout(() => setCracked(false), 3000)
    }
  }

  return (
    <div className="relative mt-2">
      {/* 期待信息卡片 */}
      <motion.div
        className="bg-gray-50/80 dark:bg-gray-700/50 rounded-xl p-3 border border-dashed border-gray-300 dark:border-gray-600"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mb-2">
          等待下一个任务...
        </p>

        {/* 白色浮空带子 */}
        <motion.div
          className={`relative mx-auto w-[80%] h-6 rounded-md cursor-pointer overflow-hidden
            ${cracked
              ? 'bg-gradient-to-r from-white via-gray-100 to-white ribbon-cracked'
              : 'bg-white dark:bg-gray-300 shadow-[0_2px_12px_rgba(255,255,255,0.3)]'
            }`}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRibbonClick}
        >
          {/* 带子上的浮空阴影效果 */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[9px] text-gray-400 font-medium tracking-wider">
              {cracked ? '✂ 已复制' : existingPrompt ? '✎ 点击编辑提示词' : '✎ 点击输入提示词'}
            </span>
          </div>

          {/* 裂纹效果 */}
          {cracked && (
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-px bg-gray-400/60"
                  style={{
                    left: `${20 + i * 15}%`,
                    top: 0,
                    height: '100%',
                    transform: `rotate(${-10 + i * 5}deg)`
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                />
              ))}
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* 提示词输入弹窗 */}
      <AnimatePresence>
        {showInput && (
          <motion.div
            className="absolute bottom-full left-0 right-0 mb-2 z-10"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
          >
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-3">
              <textarea
                className="w-full text-xs bg-gray-50 dark:bg-gray-700 rounded-lg p-2 resize-none outline-none border border-gray-200 dark:border-gray-600 min-h-[60px]"
                value={promptText}
                onChange={e => setPromptText(e.target.value)}
                placeholder="输入下一个任务的提示词..."
                autoFocus
                rows={3}
              />
              <div className="flex gap-2 mt-2">
                <motion.button
                  className="flex-1 flex items-center justify-center gap-1 bg-blue-500 text-white text-xs rounded-lg py-1.5"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { handleClip(); setShowInput(false) }}
                >
                  {cracked ? <Check className="w-3 h-3" /> : <Clipboard className="w-3 h-3" />}
                  Clip
                </motion.button>
                <button
                  className="px-3 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-lg py-1.5"
                  onClick={() => setShowInput(false)}
                >
                  关闭
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
