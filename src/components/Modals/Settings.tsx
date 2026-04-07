// ============================================================
// 设置弹窗组件
// 提供显示配置选项：卡片高度模式、运行状态引导、侧栏显隐等
// 使用与 API 详情类似的 Portal 弹窗方式
// ============================================================

import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Settings as SettingsIcon, Monitor, Sidebar, CreditCard } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useSettingsStore } from '../../stores/settingsStore'
import GlassCard from '../common/GlassCard'
import BlurOverlay from '../common/BlurOverlay'

/** 开关组件 */
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.button
      className={`relative w-10 h-5 rounded-full transition-colors ${
        enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
      }`}
      onClick={() => onChange(!enabled)}
      whileTap={{ scale: 0.95 }}
    >
      <motion.span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
        animate={{ left: enabled ? 21 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.button>
  )
}

/** 配置项行 */
function ConfigRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0">
      <div className="min-w-0 flex-1 mr-4">
        <p className="text-sm text-gray-700 dark:text-gray-200">{label}</p>
        {desc && <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function Settings() {
  const show = useUIStore(s => s.showSettings)
  const setShow = useUIStore(s => s.setShowSettings)
  const { displayConfig, updateDisplayConfig } = useSettingsStore()

  return createPortal(
    <AnimatePresence>
      {show && (
        <>
          <BlurOverlay onClick={() => setShow(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 pointer-events-none">
            <GlassCard modal className="w-full max-w-md max-h-[75vh] overflow-hidden flex flex-col pointer-events-auto">
              {/* 头部 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 shrink-0">
                <div className="flex items-center gap-2">
                  <SettingsIcon className="w-4 h-4 text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">显示设置</h2>
                </div>
                <button
                  className="p-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-600/50"
                  onClick={() => setShow(false)}
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* 配置区域 */}
              <div className="flex-1 overflow-y-auto px-6 py-4 scroll-y-smooth space-y-5">
                {/* 卡片显示 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">卡片显示</span>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-xl px-4">
                    <ConfigRow
                      label="完整信息展示"
                      desc="关闭后卡片固定高度，超出信息用省略号显示"
                    >
                      <Toggle
                        enabled={displayConfig.cardHeightMode === 'full'}
                        onChange={(v) => updateDisplayConfig({ cardHeightMode: v ? 'full' : 'fixed' })}
                      />
                    </ConfigRow>
                  </div>
                </div>

                {/* 状态指示 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Monitor className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">状态指示</span>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-xl px-4">
                    <ConfigRow
                      label="运行状态引导"
                      desc="开启后运行中的项目标题颜色闪烁，全部完成显示绿色环"
                    >
                      <Toggle
                        enabled={displayConfig.showRunningGuide}
                        onChange={(v) => updateDisplayConfig({ showRunningGuide: v })}
                      />
                    </ConfigRow>
                  </div>
                </div>

                {/* 侧栏显示 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sidebar className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">侧栏显示</span>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-xl px-4">
                    <ConfigRow
                      label="显示服务地址"
                      desc="侧栏中显示 Host:Port 服务地址配置区域"
                    >
                      <Toggle
                        enabled={displayConfig.showServerConfig}
                        onChange={(v) => updateDisplayConfig({ showServerConfig: v })}
                      />
                    </ConfigRow>
                    <ConfigRow
                      label="显示 API 详情"
                      desc="侧栏中显示 API 详情入口按钮"
                    >
                      <Toggle
                        enabled={displayConfig.showApiDetail}
                        onChange={(v) => updateDisplayConfig({ showApiDetail: v })}
                      />
                    </ConfigRow>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
