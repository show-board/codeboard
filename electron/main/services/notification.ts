// ============================================================
// 系统通知服务
// 当 Agent 推送任务更新时，向 macOS 发送原生系统通知
// ============================================================

import { Notification, BrowserWindow } from 'electron'

/** 任务更新数据接口 */
interface TaskNotificationData {
  project_id: string
  type: string
  task_name?: string
  task_summary?: string
  content?: string
}

/** 根据任务类型生成通知标题 */
function getNotificationTitle(type: string): string {
  const titles: Record<string, string> = {
    'session_start': '🚀 Session 开始',
    'task_start': '⚡ 任务启动',
    'task_progress': '📊 任务进展',
    'task_complete': '✅ 任务完成',
    'session_complete': '🎉 Session 完成'
  }
  return titles[type] || '📋 任务更新'
}

/** 发送系统通知并转发给渲染进程 */
export function sendTaskNotification(data: TaskNotificationData, mainWindow: BrowserWindow | null) {
  // 发送 macOS 原生通知
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: getNotificationTitle(data.type),
      body: data.task_name || data.task_summary || data.content || '收到新的任务更新',
      silent: false
    })
    notification.show()
  }

  // 转发给渲染进程，触发前端 UI 更新
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('task-update', data)
    mainWindow.webContents.send('notification', data)
  }
}

/** 发送项目更新通知（项目注册/状态变更等） */
export function sendProjectNotification(data: unknown, mainWindow: BrowserWindow | null) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('project-update', data)
  }
}
