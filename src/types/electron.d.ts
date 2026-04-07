// Electron preload API 的 TypeScript 声明
interface CodeboardAPI {
  getProjects: () => Promise<Record<string, unknown>[]>
  getProject: (projectId: string) => Promise<Record<string, unknown>>
  getSessions: (projectId: string) => Promise<Record<string, unknown>[]>
  getTaskUpdates: (sessionId: string) => Promise<{ updates: Record<string, unknown>[]; session: Record<string, unknown> | null }>
  getMemoryCategories: (projectId: string) => Promise<Record<string, unknown>[]>
  getMemoryDocuments: (projectId: string, categoryId?: number) => Promise<Record<string, unknown>[]>
  getMemoryContent: (projectId: string, filePath: string) => Promise<string | null>
  getSettings: () => Promise<Record<string, string>>
  updateSettings: (settings: Record<string, string>) => Promise<{ success: boolean }>
  getUnreadNotifications: () => Promise<Record<string, unknown>[]>
  getProjectNotifications: (projectId: string) => Promise<Record<string, unknown>[]>
  markNotificationsRead: (projectId?: string) => Promise<{ success: boolean }>
  getRecommendations: () => Promise<Record<string, unknown>>
  updateProjectStatus: (projectId: string, status: string) => Promise<{ success: boolean }>
  updateProjectColor: (projectId: string, color: string) => Promise<{ success: boolean }>
  deleteProject: (projectId: string) => Promise<{ success: boolean }>
  updateSessionPrompt: (sessionId: string, promptText: string) => Promise<{ success: boolean }>
  trashSession: (sessionId: string) => Promise<{ success: boolean }>
  restoreSession: (sessionId: string) => Promise<{ success: boolean }>
  permanentDeleteSession: (sessionId: string) => Promise<{ success: boolean }>
  getTrashedSessions: () => Promise<Record<string, unknown>[]>
  clearTrashedSessions: () => Promise<{ success: boolean; count?: number }>
  clearTrashedProjects: () => Promise<{ success: boolean; count?: number }>
  selectAvatar: () => Promise<string | null>
  saveAvatar: (dataUrl: string) => Promise<{ success: boolean }>
  getAvatar: () => Promise<string | null>
  saveSkillsFile: (content: string) => Promise<{ success: boolean; path?: string }>
  getSkillsBundle: () => Promise<{ success: boolean; files: { path: string; name: string; content: string }[] }>
  saveSkillsBundle: (files: { path: string; content: string }[]) => Promise<{ success: boolean; path?: string }>
  restartServer: (host: string, port: number) => Promise<{ success: boolean; host: string; port: number }>
  getServerInfo: () => Promise<{ host: string; port: number }>
  onProjectUpdate: (callback: (...args: unknown[]) => void) => () => void
  onTaskUpdate: (callback: (...args: unknown[]) => void) => () => void
  onNotification: (callback: (...args: unknown[]) => void) => () => void
}

interface Window {
  codeboard: CodeboardAPI
}
