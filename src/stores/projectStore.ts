// ============================================================
// 项目状态管理 (Zustand)
// 管理所有项目数据、Session 数据、任务更新、通知消息等
// ============================================================

import { create } from 'zustand'

/** 项目数据 */
interface Project {
  id: number
  project_id: string
  name: string
  description: string
  color: string
  status: 'visible' | 'hidden' | 'trashed'
  created_at: string
  updated_at: string
}

/** Session 数据 */
interface Session {
  id: number
  session_id: string
  project_id: string
  goal: string
  task_list: { name: string; status: string }[]
  status: 'queued' | 'running' | 'completed'
  summary: string
  prompt_text?: string
  created_at: string
  updated_at: string
}

/** 任务更新数据 */
interface TaskUpdate {
  id: number
  task_id: string
  session_id: string
  project_id: string
  type: string
  task_name?: string
  task_plan?: string
  task_summary?: string
  content?: string
  created_at: string
}

/** Session 详情（从 task updates API 一起返回） */
interface SessionDetail {
  session_id: string
  project_id: string
  goal: string
  task_list: { name: string; status: string }[]
  status: string
  summary: string
  created_at: string
  updated_at: string
}

/** 通知数据 */
interface Notification {
  id: number
  project_id: string
  type: string
  content: string
  is_read: number
  color: string
  project_name: string
  created_at: string
}

interface ProjectState {
  // 数据
  projects: Project[]
  sessions: Record<string, Session[]>
  taskUpdates: Record<string, TaskUpdate[]>
  sessionDetails: Record<string, SessionDetail>
  notifications: Notification[]

  // 加载方法
  loadProjects: () => Promise<void>
  loadSessions: (projectId: string) => Promise<void>
  loadTaskUpdates: (sessionId: string) => Promise<void>
  loadNotifications: () => Promise<void>

  // 操作方法
  hideProject: (projectId: string) => Promise<void>
  trashProject: (projectId: string) => Promise<void>
  restoreProject: (projectId: string) => Promise<void>
  permanentDeleteProject: (projectId: string) => Promise<void>
  changeProjectColor: (projectId: string, color: string) => Promise<void>
  updatePromptText: (sessionId: string, text: string) => Promise<void>
  markNotificationsRead: (projectId?: string) => Promise<void>

  // Session 垃圾篓操作
  trashSession: (sessionId: string, projectId: string) => Promise<void>
  restoreSession: (sessionId: string, projectId: string) => Promise<void>
  permanentDeleteSession: (sessionId: string) => Promise<void>

  // 实时更新处理
  handleTaskUpdate: (data: Record<string, unknown>) => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  sessions: {},
  taskUpdates: {},
  sessionDetails: {},
  notifications: [],

  /** 加载所有项目 */
  loadProjects: async () => {
    try {
      const projects = await window.codeboard.getProjects()
      set({ projects: projects as unknown as Project[] })
    } catch (err) {
      console.error('加载项目失败:', err)
    }
  },

  /** 加载指定项目的 Sessions */
  loadSessions: async (projectId: string) => {
    try {
      const sessions = await window.codeboard.getSessions(projectId)
      set(state => ({
        sessions: { ...state.sessions, [projectId]: sessions as unknown as Session[] }
      }))
    } catch (err) {
      console.error('加载 Sessions 失败:', err)
    }
  },

  /** 加载指定 Session 的任务更新及 Session 详情 */
  loadTaskUpdates: async (sessionId: string) => {
    try {
      const result = await window.codeboard.getTaskUpdates(sessionId) as { updates: TaskUpdate[]; session: SessionDetail | null }
      set(state => ({
        taskUpdates: { ...state.taskUpdates, [sessionId]: (result.updates || []) as TaskUpdate[] },
        sessionDetails: result.session
          ? { ...state.sessionDetails, [sessionId]: result.session as SessionDetail }
          : state.sessionDetails
      }))
    } catch (err) {
      console.error('加载任务更新失败:', err)
    }
  },

  /** 加载未读通知 */
  loadNotifications: async () => {
    try {
      const notifications = await window.codeboard.getUnreadNotifications()
      set({ notifications: notifications as unknown as Notification[] })
    } catch (err) {
      console.error('加载通知失败:', err)
    }
  },

  /** 隐藏项目（移到全部项目中） */
  hideProject: async (projectId: string) => {
    await window.codeboard.updateProjectStatus(projectId, 'hidden')
    get().loadProjects()
  },

  /** 丢弃项目（移到垃圾篓） */
  trashProject: async (projectId: string) => {
    await window.codeboard.updateProjectStatus(projectId, 'trashed')
    get().loadProjects()
  },

  /** 恢复项目为可见 */
  restoreProject: async (projectId: string) => {
    await window.codeboard.updateProjectStatus(projectId, 'visible')
    get().loadProjects()
  },

  /** 永久删除项目 */
  permanentDeleteProject: async (projectId: string) => {
    await window.codeboard.deleteProject(projectId)
    get().loadProjects()
  },

  /** 修改项目颜色 */
  changeProjectColor: async (projectId: string, color: string) => {
    await window.codeboard.updateProjectColor(projectId, color)
    get().loadProjects()
  },

  /** 更新 Session 提示词 */
  updatePromptText: async (sessionId: string, text: string) => {
    await window.codeboard.updateSessionPrompt(sessionId, text)
  },

  /** 标记通知已读 */
  markNotificationsRead: async (projectId?: string) => {
    await window.codeboard.markNotificationsRead(projectId)
    get().loadNotifications()
  },

  /** 将 Session 移入垃圾篓 */
  trashSession: async (sessionId: string, projectId: string) => {
    await window.codeboard.trashSession(sessionId)
    get().loadSessions(projectId)
  },

  /** 从垃圾篓恢复 Session */
  restoreSession: async (sessionId: string, projectId: string) => {
    await window.codeboard.restoreSession(sessionId)
    get().loadSessions(projectId)
  },

  /** 永久删除 Session */
  permanentDeleteSession: async (sessionId: string) => {
    await window.codeboard.permanentDeleteSession(sessionId)
  },

  /** 处理实时任务更新（来自 Socket.IO） */
  handleTaskUpdate: (data: Record<string, unknown>) => {
    const projectId = data.project_id as string
    // 重新加载受影响的项目和 session
    get().loadProjects()
    if (projectId) {
      get().loadSessions(projectId)
    }
    get().loadNotifications()
  }
}))
