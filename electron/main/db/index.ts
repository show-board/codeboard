// ============================================================
// SQLite 数据库初始化与 CRUD 操作封装
// 使用 better-sqlite3 提供同步、高性能的数据库访问
// ============================================================

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { CREATE_TABLES_SQL, DEFAULT_SETTINGS, DEFAULT_MEMORY_CATEGORIES } from './schema'

let db: Database.Database

/** 获取数据库文件路径（开发/生产环境自适应） */
function getDbPath(): string {
  const userDataPath = app?.getPath?.('userData') || path.resolve(process.cwd(), 'data')
  const dbDir = path.join(userDataPath, 'data')
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  return path.join(dbDir, 'codeboard.sqlite')
}

/** 初始化数据库：创建表、插入默认设置 */
export function initDatabase(): Database.Database {
  const dbPath = getDbPath()
  db = new Database(dbPath)

  // 启用 WAL 模式提高并发性能
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // 创建所有表
  db.exec(CREATE_TABLES_SQL)

  // 迁移：为 sessions 表添加 is_trashed 列（软删除支持）
  try {
    db.exec('ALTER TABLE sessions ADD COLUMN is_trashed INTEGER DEFAULT 0')
  } catch {
    // 列已存在则忽略
  }

  // 插入默认设置（如果不存在）
  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO user_settings (key, value) VALUES (?, ?)'
  )
  for (const s of DEFAULT_SETTINGS) {
    insertSetting.run(s.key, s.value)
  }

  return db
}

/** 获取数据库实例 */
export function getDb(): Database.Database {
  if (!db) {
    throw new Error('数据库尚未初始化，请先调用 initDatabase()')
  }
  return db
}

// ---- 项目 CRUD ----

export function createProject(projectId: string, name: string, description: string) {
  const db = getDb()
  // 检查 project_id 和 name 是否已存在
  const existing = db.prepare('SELECT id FROM projects WHERE project_id = ? OR name = ?').get(projectId, name)
  if (existing) {
    return { success: false, error: '项目 ID 或名称已存在，请更换后重试' }
  }
  // 从预设颜色池中随机选取（避免与已有项目颜色重复）
  const color = generateUniqueColor(db)
  const stmt = db.prepare(
    'INSERT INTO projects (project_id, name, description, color) VALUES (?, ?, ?, ?)'
  )
  const result = stmt.run(projectId, name, description, color)

  // 为新项目创建默认记忆分类
  const insertCategory = db.prepare(
    'INSERT INTO memory_categories (project_id, name, description, sort_order) VALUES (?, ?, ?, ?)'
  )
  for (const cat of DEFAULT_MEMORY_CATEGORIES) {
    insertCategory.run(projectId, cat.name, cat.description, cat.sort_order)
  }

  return { success: true, data: { id: result.lastInsertRowid, project_id: projectId, color } }
}

export function getProject(projectId: string) {
  return getDb().prepare('SELECT * FROM projects WHERE project_id = ?').get(projectId)
}

export function getAllProjects() {
  return getDb().prepare('SELECT * FROM projects ORDER BY updated_at DESC').all()
}

export function updateProject(projectId: string, fields: Record<string, string>) {
  const db = getDb()
  const sets: string[] = []
  const values: string[] = []
  for (const [k, v] of Object.entries(fields)) {
    if (['name', 'description', 'color', 'status'].includes(k)) {
      sets.push(`${k} = ?`)
      values.push(v)
    }
  }
  if (sets.length === 0) return { success: false, error: '无可更新字段' }
  sets.push("updated_at = datetime('now', 'localtime')")
  values.push(projectId)
  db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE project_id = ?`).run(...values)
  return { success: true }
}

export function deleteProject(projectId: string) {
  const db = getDb()
  db.prepare('DELETE FROM task_updates WHERE project_id = ?').run(projectId)
  db.prepare('DELETE FROM sessions WHERE project_id = ?').run(projectId)
  db.prepare('DELETE FROM memory_documents WHERE project_id = ?').run(projectId)
  db.prepare('DELETE FROM memory_categories WHERE project_id = ?').run(projectId)
  db.prepare('DELETE FROM notifications WHERE project_id = ?').run(projectId)
  db.prepare('DELETE FROM projects WHERE project_id = ?').run(projectId)
  return { success: true }
}

// ---- Session CRUD ----

export function createSession(sessionId: string, projectId: string, goal: string, taskList: object[]) {
  const db = getDb()
  db.prepare(
    'INSERT INTO sessions (session_id, project_id, goal, task_list_json, status) VALUES (?, ?, ?, ?, ?)'
  ).run(sessionId, projectId, goal, JSON.stringify(taskList), 'running')
  // 更新项目的 updated_at
  db.prepare("UPDATE projects SET updated_at = datetime('now', 'localtime') WHERE project_id = ?").run(projectId)
  return { success: true, session_id: sessionId }
}

export function updateSession(sessionId: string, fields: Record<string, unknown>) {
  const db = getDb()
  const sets: string[] = []
  const values: unknown[] = []
  if (fields.status) { sets.push('status = ?'); values.push(fields.status) }
  if (fields.summary) { sets.push('summary = ?'); values.push(fields.summary) }
  if (fields.goal) { sets.push('goal = ?'); values.push(fields.goal) }
  if (fields.task_list) { sets.push('task_list_json = ?'); values.push(JSON.stringify(fields.task_list)) }
  if (fields.prompt_text !== undefined) { sets.push('prompt_text = ?'); values.push(fields.prompt_text) }
  if (sets.length === 0) return { success: false, error: '无可更新字段' }
  sets.push("updated_at = datetime('now', 'localtime')")
  values.push(sessionId)
  db.prepare(`UPDATE sessions SET ${sets.join(', ')} WHERE session_id = ?`).run(...values)
  return { success: true }
}

export function getSessionsByProject(projectId: string) {
  return getDb().prepare(
    'SELECT * FROM sessions WHERE project_id = ? AND (is_trashed IS NULL OR is_trashed = 0) ORDER BY created_at DESC'
  ).all(projectId)
}

/** 获取所有已移入垃圾篓的 Sessions */
export function getTrashedSessions() {
  return getDb().prepare(
    `SELECT s.*, p.name as project_name, p.color as project_color
     FROM sessions s JOIN projects p ON s.project_id = p.project_id
     WHERE s.is_trashed = 1 ORDER BY s.updated_at DESC`
  ).all()
}

/** 将 Session 移入垃圾篓（软删除） */
export function trashSession(sessionId: string) {
  getDb().prepare("UPDATE sessions SET is_trashed = 1, updated_at = datetime('now', 'localtime') WHERE session_id = ?").run(sessionId)
  return { success: true }
}

/** 从垃圾篓恢复 Session */
export function restoreSession(sessionId: string) {
  getDb().prepare("UPDATE sessions SET is_trashed = 0, updated_at = datetime('now', 'localtime') WHERE session_id = ?").run(sessionId)
  return { success: true }
}

/** 永久删除 Session 及其关联的任务更新 */
export function permanentDeleteSession(sessionId: string) {
  const db = getDb()
  db.prepare('DELETE FROM task_updates WHERE session_id = ?').run(sessionId)
  db.prepare('DELETE FROM sessions WHERE session_id = ?').run(sessionId)
  return { success: true }
}

/** 批量永久删除所有已回收的 Sessions */
export function clearTrashedSessions() {
  const db = getDb()
  const trashed = db.prepare('SELECT session_id FROM sessions WHERE is_trashed = 1').all() as { session_id: string }[]
  for (const s of trashed) {
    db.prepare('DELETE FROM task_updates WHERE session_id = ?').run(s.session_id)
  }
  db.prepare('DELETE FROM sessions WHERE is_trashed = 1').run()
  return { success: true, count: trashed.length }
}

/** 根据 session_id 获取单个 Session */
export function getSessionBySessionId(sessionId: string) {
  return getDb().prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId)
}

// ---- 任务更新 ----

export function addTaskUpdate(data: {
  task_id: string; session_id: string; project_id: string;
  type: string; task_name?: string; task_plan?: string;
  task_summary?: string; content?: string;
}) {
  const db = getDb()
  db.prepare(
    `INSERT INTO task_updates (task_id, session_id, project_id, type, task_name, task_plan, task_summary, content)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(data.task_id, data.session_id, data.project_id, data.type,
    data.task_name || '', data.task_plan || '', data.task_summary || '', data.content || '')

  // 同时更新 session 和 project 的时间戳
  db.prepare("UPDATE sessions SET updated_at = datetime('now', 'localtime') WHERE session_id = ?").run(data.session_id)
  db.prepare("UPDATE projects SET updated_at = datetime('now', 'localtime') WHERE project_id = ?").run(data.project_id)

  // 如果是 session_complete 类型，更新 session 状态为 completed
  if (data.type === 'session_complete') {
    db.prepare("UPDATE sessions SET status = 'completed', summary = ? WHERE session_id = ?")
      .run(data.task_summary || '', data.session_id)
  }
  // 如果是 session_start 类型，确保 session 状态为 running
  if (data.type === 'session_start') {
    db.prepare("UPDATE sessions SET status = 'running' WHERE session_id = ?").run(data.session_id)
  }

  return { success: true }
}

export function getTaskUpdatesBySession(sessionId: string) {
  return getDb().prepare('SELECT * FROM task_updates WHERE session_id = ? ORDER BY created_at ASC').all(sessionId)
}

// ---- 记忆管理 ----

export function getMemoryCategories(projectId: string) {
  return getDb().prepare(
    'SELECT * FROM memory_categories WHERE project_id = ? ORDER BY sort_order ASC'
  ).all(projectId)
}

export function createMemoryCategory(projectId: string, name: string, description: string) {
  const db = getDb()
  const maxOrder = db.prepare(
    'SELECT MAX(sort_order) as max_order FROM memory_categories WHERE project_id = ?'
  ).get(projectId) as { max_order: number | null }
  const sortOrder = (maxOrder?.max_order || 0) + 1
  db.prepare(
    'INSERT OR IGNORE INTO memory_categories (project_id, name, description, sort_order) VALUES (?, ?, ?, ?)'
  ).run(projectId, name, description, sortOrder)
  return { success: true }
}

export function getMemoryDocuments(projectId: string, categoryId?: number) {
  const db = getDb()
  if (categoryId) {
    return db.prepare(
      'SELECT * FROM memory_documents WHERE project_id = ? AND category_id = ? ORDER BY updated_at DESC'
    ).all(projectId, categoryId)
  }
  return db.prepare(
    'SELECT * FROM memory_documents WHERE project_id = ? ORDER BY updated_at DESC'
  ).all(projectId)
}

export function upsertMemoryDocument(
  projectId: string, categoryId: number, title: string,
  filePath: string, contentHash: string
) {
  const db = getDb()
  const existing = db.prepare(
    'SELECT id FROM memory_documents WHERE project_id = ? AND file_path = ?'
  ).get(projectId, filePath) as { id: number } | undefined

  if (existing) {
    db.prepare(
      `UPDATE memory_documents SET title = ?, content_hash = ?, 
       updated_at = datetime('now', 'localtime') WHERE id = ?`
    ).run(title, contentHash, existing.id)
    return { success: true, id: existing.id, action: 'updated' }
  } else {
    const r = db.prepare(
      `INSERT INTO memory_documents (project_id, category_id, title, file_path, content_hash)
       VALUES (?, ?, ?, ?, ?)`
    ).run(projectId, categoryId, title, filePath, contentHash)
    return { success: true, id: r.lastInsertRowid, action: 'created' }
  }
}

export function deleteMemoryDocument(docId: number) {
  getDb().prepare('DELETE FROM memory_documents WHERE id = ?').run(docId)
  return { success: true }
}

// ---- 用户设置 ----

export function getSettings() {
  const rows = getDb().prepare('SELECT * FROM user_settings').all() as { key: string; value: string }[]
  const settings: Record<string, string> = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }
  return settings
}

export function updateSettings(newSettings: Record<string, string>) {
  const db = getDb()
  const stmt = db.prepare('INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)')
  for (const [k, v] of Object.entries(newSettings)) {
    stmt.run(k, v)
  }
  return { success: true }
}

// ---- 通知 ----

export function addNotification(projectId: string, type: string, content: string) {
  getDb().prepare(
    'INSERT INTO notifications (project_id, type, content) VALUES (?, ?, ?)'
  ).run(projectId, type, content)
}

export function getUnreadNotifications() {
  return getDb().prepare(
    'SELECT n.*, p.color, p.name as project_name FROM notifications n JOIN projects p ON n.project_id = p.project_id WHERE n.is_read = 0 ORDER BY n.created_at DESC'
  ).all()
}

export function markNotificationsRead(projectId?: string) {
  const db = getDb()
  if (projectId) {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE project_id = ?').run(projectId)
  } else {
    db.prepare('UPDATE notifications SET is_read = 1').run()
  }
  return { success: true }
}

/** 获取指定项目的所有通知（最近 100 条，含已读），用于消息详情面板 */
export function getNotificationsByProject(projectId: string) {
  return getDb().prepare(
    'SELECT n.*, p.color, p.name as project_name FROM notifications n JOIN projects p ON n.project_id = p.project_id WHERE n.project_id = ? ORDER BY n.created_at DESC LIMIT 100'
  ).all(projectId)
}

// ---- 推荐系统 ----

export function getRecommendations() {
  const db = getDb()
  // 获取有未完成 Session 的项目
  const activeSessions = db.prepare(`
    SELECT p.*, s.session_id, s.goal, s.status as session_status, s.updated_at as session_updated
    FROM projects p
    JOIN sessions s ON p.project_id = s.project_id
    WHERE p.status = 'visible' AND s.status = 'running'
    ORDER BY s.updated_at DESC
  `).all()

  // 获取最近活跃但超过 24h 未更新的项目
  const staleProjects = db.prepare(`
    SELECT * FROM projects 
    WHERE status = 'visible' 
    AND updated_at < datetime('now', '-1 day', 'localtime')
    AND updated_at > datetime('now', '-7 days', 'localtime')
    ORDER BY updated_at DESC LIMIT 5
  `).all()

  // 获取有提示词的期待卡片
  const withPrompts = db.prepare(`
    SELECT p.*, s.session_id, s.prompt_text
    FROM projects p
    JOIN sessions s ON p.project_id = s.project_id
    WHERE p.status = 'visible' AND s.prompt_text != '' AND s.prompt_text IS NOT NULL
    ORDER BY s.updated_at DESC
  `).all()

  return { activeSessions, staleProjects, withPrompts }
}

// ---- 辅助函数 ----

/** 从颜色池中生成一个与已有项目不重复的颜色 */
function generateUniqueColor(db: Database.Database): string {
  const COLOR_POOL = [
    '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE',
    '#FF2D55', '#5856D6', '#00C7BE', '#FF6482', '#30B0C7',
    '#A2845E', '#FF6961', '#77DD77', '#FDFD96', '#84B6F4',
    '#B19CD9', '#FFB347', '#03C03C', '#966FD6', '#C23B22'
  ]
  const usedColors = db.prepare('SELECT color FROM projects').all() as { color: string }[]
  const usedSet = new Set(usedColors.map(c => c.color))
  const available = COLOR_POOL.filter(c => !usedSet.has(c))
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)]
  }
  // 如果颜色用完，生成随机色
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
}

/** 获取记忆文件存储根目录 */
export function getMemoriesDir(): string {
  const userDataPath = app?.getPath?.('userData') || path.resolve(process.cwd(), 'data')
  const memDir = path.join(userDataPath, 'data', 'memories')
  if (!fs.existsSync(memDir)) {
    fs.mkdirSync(memDir, { recursive: true })
  }
  return memDir
}
