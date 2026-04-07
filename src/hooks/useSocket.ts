// ============================================================
// Socket.IO / IPC 实时通信 Hook
// 监听来自 Electron 主进程的事件推送，触发 UI 更新
// ============================================================

import { useEffect } from 'react'
import { useProjectStore } from '../stores/projectStore'

/** 注册实时事件监听，自动在组件卸载时清理 */
export function useSocket() {
  const handleTaskUpdate = useProjectStore(s => s.handleTaskUpdate)
  const loadProjects = useProjectStore(s => s.loadProjects)
  const loadNotifications = useProjectStore(s => s.loadNotifications)

  useEffect(() => {
    // 监听任务更新事件
    const unsubTask = window.codeboard.onTaskUpdate((data) => {
      handleTaskUpdate(data as Record<string, unknown>)
    })

    // 监听项目更新事件
    const unsubProject = window.codeboard.onProjectUpdate(() => {
      loadProjects()
    })

    // 监听通知事件
    const unsubNotification = window.codeboard.onNotification(() => {
      loadNotifications()
    })

    return () => {
      unsubTask()
      unsubProject()
      unsubNotification()
    }
  }, [handleTaskUpdate, loadProjects, loadNotifications])
}
