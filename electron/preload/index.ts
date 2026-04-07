// ============================================================
// Electron 预加载脚本
// 通过 contextBridge 安全地暴露 IPC 通信接口给渲染进程
// ============================================================

import { contextBridge, ipcRenderer } from 'electron'

/** 暴露给渲染进程的 API 接口 */
const api = {
  // ---- 项目管理 ----
  getProjects: () => ipcRenderer.invoke('get-projects'),
  getProject: (projectId: string) => ipcRenderer.invoke('get-project', projectId),

  // ---- Session 管理 ----
  getSessions: (projectId: string) => ipcRenderer.invoke('get-sessions', projectId),

  // ---- 任务更新（返回 { updates, session }） ----
  getTaskUpdates: (sessionId: string) => ipcRenderer.invoke('get-task-updates', sessionId),

  // ---- 记忆管理 ----
  getMemoryCategories: (projectId: string) => ipcRenderer.invoke('get-memory-categories', projectId),
  getMemoryDocuments: (projectId: string, categoryId?: number) =>
    ipcRenderer.invoke('get-memory-documents', projectId, categoryId),
  getMemoryContent: (projectId: string, filePath: string) =>
    ipcRenderer.invoke('get-memory-content', projectId, filePath),

  // ---- 用户设置 ----
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: Record<string, string>) =>
    ipcRenderer.invoke('update-settings', settings),

  // ---- 通知 ----
  getUnreadNotifications: () => ipcRenderer.invoke('get-unread-notifications'),
  getProjectNotifications: (projectId: string) => ipcRenderer.invoke('get-project-notifications', projectId),
  markNotificationsRead: (projectId?: string) =>
    ipcRenderer.invoke('mark-notifications-read', projectId),

  // ---- 推荐 ----
  getRecommendations: () => ipcRenderer.invoke('get-recommendations'),

  // ---- 项目操作 ----
  updateProjectStatus: (projectId: string, status: string) =>
    ipcRenderer.invoke('update-project-status', projectId, status),
  updateProjectColor: (projectId: string, color: string) =>
    ipcRenderer.invoke('update-project-color', projectId, color),
  deleteProject: (projectId: string) => ipcRenderer.invoke('delete-project', projectId),

  // ---- Session 提示词 ----
  updateSessionPrompt: (sessionId: string, promptText: string) =>
    ipcRenderer.invoke('update-session-prompt', sessionId, promptText),

  // ---- Session 垃圾篓操作 ----
  trashSession: (sessionId: string) => ipcRenderer.invoke('trash-session', sessionId),
  restoreSession: (sessionId: string) => ipcRenderer.invoke('restore-session', sessionId),
  permanentDeleteSession: (sessionId: string) => ipcRenderer.invoke('permanent-delete-session', sessionId),
  getTrashedSessions: () => ipcRenderer.invoke('get-trashed-sessions'),
  clearTrashedSessions: () => ipcRenderer.invoke('clear-trashed-sessions'),
  clearTrashedProjects: () => ipcRenderer.invoke('clear-trashed-projects'),

  // ---- 头像管理 ----
  selectAvatar: () => ipcRenderer.invoke('select-avatar'),
  saveAvatar: (dataUrl: string) => ipcRenderer.invoke('save-avatar', dataUrl),
  getAvatar: () => ipcRenderer.invoke('get-avatar'),

  // ---- Skills 文件管理 ----
  saveSkillsFile: (content: string) => ipcRenderer.invoke('save-skills-file', content),
  getSkillsBundle: () => ipcRenderer.invoke('get-skills-bundle'),
  saveSkillsBundle: (files: { path: string; content: string }[]) =>
    ipcRenderer.invoke('save-skills-bundle', files),

  // ---- 服务器管理 ----
  restartServer: (host: string, port: number) =>
    ipcRenderer.invoke('restart-server', host, port),
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),

  // ---- 事件监听（Socket.IO 消息转发） ----
  onProjectUpdate: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on('project-update', (_event, ...args) => callback(...args))
    return () => ipcRenderer.removeAllListeners('project-update')
  },
  onTaskUpdate: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on('task-update', (_event, ...args) => callback(...args))
    return () => ipcRenderer.removeAllListeners('task-update')
  },
  onNotification: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on('notification', (_event, ...args) => callback(...args))
    return () => ipcRenderer.removeAllListeners('notification')
  }
}

// 通过 contextBridge 安全暴露 API
contextBridge.exposeInMainWorld('codeboard', api)

// TypeScript 类型声明
export type CodeboardAPI = typeof api
