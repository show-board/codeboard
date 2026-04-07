// ============================================================
// CodeBoard 根组件
// 组装整体布局：Sidebar + 展示区（Toolbar + MessageBar + Board）
// 管理全局数据加载和 Socket.IO 监听
// ============================================================

import { useEffect } from 'react'
import { useProjectStore } from './stores/projectStore'
import { useSettingsStore } from './stores/settingsStore'
import { useSocket } from './hooks/useSocket'
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import MessageBar from './components/MessageBar'
import Board from './components/Board'
import Recommendation from './components/Recommendation'
import ProjectDetail from './components/Modals/ProjectDetail'
import AllProjects from './components/Modals/AllProjects'
import TrashBin from './components/Modals/TrashBin'
import TaskDetail from './components/Modals/TaskDetail'
import MemoryManager from './components/Modals/MemoryManager'
import SkillsGenerator from './components/Modals/SkillsGenerator'
import HelpGuide from './components/Modals/HelpGuide'
import NotificationDetail from './components/Modals/NotificationDetail'
import Settings from './components/Modals/Settings'

export default function App() {
  const loadProjects = useProjectStore(s => s.loadProjects)
  const loadNotifications = useProjectStore(s => s.loadNotifications)
  const loadSettings = useSettingsStore(s => s.loadSettings)

  // 注册实时事件监听
  useSocket()

  // 初始化：加载设置、项目、通知；同时打印调试信息到控制台（主进程可捕获）
  useEffect(() => {
    console.log('[CodeBoard] App 组件已挂载，开始加载数据')
    loadSettings()
    loadProjects()
    loadNotifications()
    console.log('[CodeBoard] 数据加载请求已发出')

    // 定时刷新（每 30 秒）
    const interval = setInterval(() => {
      loadProjects()
      loadNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [loadSettings, loadProjects, loadNotifications])

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-100 dark:bg-neutral-900">
      {/* 左侧面板 (1/6) */}
      <Sidebar />

      {/* 右侧展示区 (5/6) */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* 顶部功能区 + 消息区 (高度约 10%) */}
        <div className="h-[10%] min-h-[48px] flex border-b border-gray-200 dark:border-gray-700">
          {/* 功能区 (宽度 0-50%) */}
          <div className="w-1/2">
            <Toolbar />
          </div>
          {/* 消息区 (宽度 50-100%) */}
          <div className="w-1/2 border-l border-gray-200 dark:border-gray-700">
            <MessageBar />
          </div>
        </div>

        {/* 看板区 (高度 10-100%) */}
        <div className="flex-1 overflow-hidden relative">
          <Board />
          {/* 推荐任务浮层 */}
          <Recommendation />
        </div>
      </main>

      {/* 全局弹窗层 */}
      <ProjectDetail />
      <AllProjects />
      <TrashBin />
      <TaskDetail />
      <MemoryManager />
      <SkillsGenerator />
      <HelpGuide />
      <NotificationDetail />
      <Settings />
    </div>
  )
}
