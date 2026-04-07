// ============================================================
// Sidebar 左侧面板
// 高度 100%，宽度约 1/6，包含用户信息、服务配置、API 详情
// 左上角包含设置按钮和帮助按钮
// ============================================================

import { HelpCircle, Settings } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useSettingsStore } from '../../stores/settingsStore'
import UserProfile from './UserProfile'
import ServerConfig from './ServerConfig'
import ApiDetail from './ApiDetail'

export default function Sidebar() {
  const setShowHelpGuide = useUIStore(s => s.setShowHelpGuide)
  const setShowSettings = useUIStore(s => s.setShowSettings)
  const displayConfig = useSettingsStore(s => s.displayConfig)

  return (
    <aside className="w-[16.67%] min-w-[200px] h-full flex flex-col bg-gray-50 dark:bg-neutral-800 backdrop-blur-xl border-r border-gray-200 dark:border-gray-700">
      {/* 标题栏拖拽区域 + 设置/帮助按钮 */}
      <div className="h-12 titlebar-drag relative">
        {/* 设置按钮 — 问号左侧 */}
        <button
          className="absolute right-10 top-3 w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors titlebar-no-drag z-10"
          onClick={() => setShowSettings(true)}
          title="显示设置"
        >
          <Settings className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
        </button>
        {/* 帮助按钮 */}
        <button
          className="absolute right-3 top-3 w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors titlebar-no-drag z-10"
          onClick={() => setShowHelpGuide(true)}
          title="使用帮助"
        >
          <HelpCircle className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
        </button>
      </div>

      {/* 上半部分：用户信息 */}
      <div className="flex-1 flex flex-col justify-center">
        <UserProfile />
      </div>

      {/* 中间部分：服务器配置（可隐藏） */}
      {displayConfig.showServerConfig && <ServerConfig />}

      {/* 下半部分：API 详情（可隐藏） */}
      {displayConfig.showApiDetail && <ApiDetail />}

      {/* 底部版本信息 */}
      <div className="px-4 py-2 text-center">
        <span className="text-[10px] text-gray-400 dark:text-gray-500">CodeBoard v1.0.0</span>
      </div>
    </aside>
  )
}
