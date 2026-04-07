// ============================================================
// CodeBoard 全局类型定义
// ============================================================

/** 项目状态枚举 */
export type ProjectStatus = 'visible' | 'hidden' | 'trashed'

/** Session 状态枚举 */
export type SessionStatus = 'queued' | 'running' | 'completed'

/** 任务更新类型枚举 */
export type TaskUpdateType =
  | 'session_start'
  | 'task_start'
  | 'task_progress'
  | 'task_complete'
  | 'session_complete'

/** 排序方式 */
export type SortType = 'updated' | 'started' | 'name'

/** 时间过滤 */
export type TimeFilter = 'all' | 'recent' | 'yesterday_today' | 'today'

// ---- 数据模型 ----

/** 项目模型 */
export interface Project {
  id: number
  project_id: string
  name: string
  description: string
  color: string
  status: ProjectStatus
  created_at: string
  updated_at: string
}

/** Session 模型 */
export interface Session {
  id: number
  session_id: string
  project_id: string
  goal: string
  task_list: TaskItem[]
  status: SessionStatus
  summary: string
  prompt_text?: string
  created_at: string
  updated_at: string
}

/** 任务列表项 */
export interface TaskItem {
  name: string
  status: 'queued' | 'running' | 'completed'
}

/** 任务更新记录 */
export interface TaskUpdate {
  id: number
  task_id: string
  session_id: string
  project_id: string
  type: TaskUpdateType
  task_name?: string
  task_plan?: string
  task_summary?: string
  content?: string
  created_at: string
}

/** 记忆分类 */
export interface MemoryCategory {
  id: number
  project_id: string
  name: string
  description: string
  sort_order: number
  created_at: string
}

/** 记忆文档 */
export interface MemoryDocument {
  id: number
  project_id: string
  category_id: number
  title: string
  file_path: string
  content?: string
  content_hash: string
  created_at: string
  updated_at: string
}

/** 用户设置 */
export interface UserSettings {
  nickname: string
  motto: string
  host: string
  port: number
}

/** 推荐项目 */
export interface Recommendation {
  project: Project
  reason: string
  priority: number
  pending_session?: Session
}

/** 消息通知（消息区彩色方块） */
export interface MessageNotification {
  project_id: string
  color: string
  count: number
  latest_type: TaskUpdateType
  latest_content: string
  timestamp: string
}

// ---- API 请求/响应 ----

/** 项目注册请求 */
export interface RegisterProjectRequest {
  project_id: string
  name: string
  description: string
}

/** 任务更新请求 */
export interface TaskUpdateRequest {
  project_id: string
  session_id: string
  task_id: string
  type: TaskUpdateType
  task_name?: string
  task_plan?: string
  task_summary?: string
  content?: string
  task_list?: TaskItem[]
  goal?: string
  summary?: string
}

/** API 通用响应 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
