// ============================================================
// 独立 API 服务器入口
// 作为子进程运行，使用系统 Node.js，避免 Electron ABI 不兼容
// 通过 IPC 与 Electron 主进程通信
// ============================================================

import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { CREATE_TABLES_SQL, DEFAULT_SETTINGS, DEFAULT_MEMORY_CATEGORIES } from '../db/schema'
import { generateSkillsTemplate } from './skillsTemplate'

// 从环境变量或命令行参数获取配置
const HOST = process.env.CB_HOST || '127.0.0.1'
const PORT = parseInt(process.env.CB_PORT || '2585', 10)
const DATA_DIR = process.env.CB_DATA_DIR || path.resolve(process.cwd(), 'data')

// ---- 数据库初始化 ----

const dbDir = path.join(DATA_DIR)
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
const db = new Database(path.join(dbDir, 'codeboard.sqlite'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.exec(CREATE_TABLES_SQL)

// 迁移：为 sessions 表添加 is_trashed 列（软删除支持）
try { db.exec('ALTER TABLE sessions ADD COLUMN is_trashed INTEGER DEFAULT 0') } catch { /* 已存在则忽略 */ }

const insertSetting = db.prepare('INSERT OR IGNORE INTO user_settings (key, value) VALUES (?, ?)')
for (const s of DEFAULT_SETTINGS) insertSetting.run(s.key, s.value)

// ---- 记忆目录 ----

const memoriesDir = path.join(DATA_DIR, 'memories')
if (!fs.existsSync(memoriesDir)) fs.mkdirSync(memoriesDir, { recursive: true })

// ---- 颜色池 ----

const COLOR_POOL = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE',
  '#FF2D55', '#5856D6', '#00C7BE', '#FF6482', '#30B0C7',
  '#A2845E', '#FF6961', '#77DD77', '#FDFD96', '#84B6F4',
  '#B19CD9', '#FFB347', '#03C03C', '#966FD6', '#C23B22'
]

function generateUniqueColor(): string {
  const used = (db.prepare('SELECT color FROM projects').all() as { color: string }[]).map(c => c.color)
  const available = COLOR_POOL.filter(c => !used.includes(c))
  return available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
}

// ---- Express App ----

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// 日志
app.use((req, _res, next) => {
  console.log(`[API] ${req.method} ${req.path}`)
  next()
})

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'CodeBoard API 运行正常', timestamp: new Date().toISOString() })
})

// Agent Skills 单文件生成（与 electron/main/server/index.ts 行为一致；DMG 子进程此前缺此路由导致魔法棒为空）
app.get('/api/skills/generate', (req, res) => {
  const qh = typeof req.query.host === 'string' ? req.query.host : HOST
  const qp = typeof req.query.port === 'string' ? req.query.port : String(PORT)
  const baseUrl = `http://${qh}:${qp}`
  res.json({
    success: true,
    data: {
      filename: 'SKILL.md',
      content: generateSkillsTemplate(baseUrl)
    }
  })
})

// ---- 项目路由 ----

app.post('/api/projects/register', (req, res) => {
  const { project_id, name, description } = req.body
  if (!project_id || !name) return res.status(400).json({ success: false, error: '缺少必要字段: project_id, name' })
  const existing = db.prepare('SELECT id FROM projects WHERE project_id = ? OR name = ?').get(project_id, name)
  if (existing) return res.status(409).json({ success: false, error: '项目 ID 或名称已存在，请更换后重试' })
  const color = generateUniqueColor()
  const result = db.prepare('INSERT INTO projects (project_id, name, description, color) VALUES (?, ?, ?, ?)').run(project_id, name, description || '', color)
  for (const cat of DEFAULT_MEMORY_CATEGORIES) {
    db.prepare('INSERT INTO memory_categories (project_id, name, description, sort_order) VALUES (?, ?, ?, ?)').run(project_id, cat.name, cat.description, cat.sort_order)
  }
  notifyParent({ type: 'project-update', data: { project_id, name, action: 'registered' } })
  res.json({ success: true, data: { id: result.lastInsertRowid, project_id, color } })
})

app.post('/api/projects/:pid/test', (req, res) => {
  const p = db.prepare('SELECT * FROM projects WHERE project_id = ?').get(req.params.pid)
  res.json(p ? { success: true, available: true, project: p } : { success: false, available: false, error: '项目不存在' })
})

app.get('/api/projects', (_req, res) => {
  res.json({ success: true, data: db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all() })
})

app.get('/api/projects/:pid', (req, res) => {
  const p = db.prepare('SELECT * FROM projects WHERE project_id = ?').get(req.params.pid)
  p ? res.json({ success: true, data: p }) : res.status(404).json({ success: false, error: '项目不存在' })
})

app.put('/api/projects/:pid', (req, res) => {
  const { name, description } = req.body
  const sets: string[] = []; const vals: string[] = []
  if (name) { sets.push('name = ?'); vals.push(name) }
  if (description !== undefined) { sets.push('description = ?'); vals.push(description) }
  if (sets.length === 0) return res.json({ success: false, error: '无可更新字段' })
  sets.push("updated_at = datetime('now', 'localtime')")
  vals.push(req.params.pid)
  db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE project_id = ?`).run(...vals)
  res.json({ success: true })
})

app.patch('/api/projects/:pid/status', (req, res) => {
  const { status } = req.body
  if (!['visible', 'hidden', 'trashed'].includes(status)) return res.status(400).json({ success: false, error: '无效状态' })
  db.prepare("UPDATE projects SET status = ?, updated_at = datetime('now', 'localtime') WHERE project_id = ?").run(status, req.params.pid)
  res.json({ success: true })
})

app.patch('/api/projects/:pid/color', (req, res) => {
  const { color } = req.body
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return res.status(400).json({ success: false, error: '无效颜色' })
  db.prepare("UPDATE projects SET color = ?, updated_at = datetime('now', 'localtime') WHERE project_id = ?").run(color, req.params.pid)
  res.json({ success: true })
})

app.delete('/api/projects/:pid', (req, res) => {
  const p = db.prepare('SELECT status FROM projects WHERE project_id = ?').get(req.params.pid) as { status: string } | undefined
  if (!p) return res.status(404).json({ success: false, error: '项目不存在' })
  if (p.status !== 'trashed') return res.status(400).json({ success: false, error: '只能删除垃圾篓中的项目' })
  db.prepare('DELETE FROM task_updates WHERE project_id = ?').run(req.params.pid)
  db.prepare('DELETE FROM sessions WHERE project_id = ?').run(req.params.pid)
  db.prepare('DELETE FROM memory_documents WHERE project_id = ?').run(req.params.pid)
  db.prepare('DELETE FROM memory_categories WHERE project_id = ?').run(req.params.pid)
  db.prepare('DELETE FROM notifications WHERE project_id = ?').run(req.params.pid)
  db.prepare('DELETE FROM projects WHERE project_id = ?').run(req.params.pid)
  res.json({ success: true })
})

// ---- Session 路由 ----

app.post('/api/sessions', (req, res) => {
  const { session_id, project_id, goal, task_list } = req.body
  if (!session_id || !project_id) return res.status(400).json({ success: false, error: '缺少 session_id/project_id' })
  const p = db.prepare('SELECT * FROM projects WHERE project_id = ?').get(project_id) as Record<string, unknown> | undefined
  if (!p) return res.status(404).json({ success: false, error: '项目不存在' })
  if (p.status !== 'visible') db.prepare("UPDATE projects SET status = 'visible', updated_at = datetime('now', 'localtime') WHERE project_id = ?").run(project_id)
  db.prepare('INSERT INTO sessions (session_id, project_id, goal, task_list_json, status) VALUES (?, ?, ?, ?, ?)').run(session_id, project_id, goal || '', JSON.stringify(task_list || []), 'running')
  db.prepare("UPDATE projects SET updated_at = datetime('now', 'localtime') WHERE project_id = ?").run(project_id)
  res.json({ success: true, session_id })
})

app.get('/api/sessions/:pid', (req, res) => {
  const sessions = db.prepare('SELECT * FROM sessions WHERE project_id = ? AND (is_trashed IS NULL OR is_trashed = 0) ORDER BY created_at DESC').all(req.params.pid) as Record<string, unknown>[]
  const parsed = sessions.map(s => ({ ...s, task_list: JSON.parse((s.task_list_json as string) || '[]') }))
  res.json({ success: true, data: parsed })
})

app.put('/api/sessions/:sid', (req, res) => {
  const { status, summary, goal, task_list, prompt_text } = req.body
  const sets: string[] = []; const vals: unknown[] = []
  if (status) { sets.push('status = ?'); vals.push(status) }
  if (summary) { sets.push('summary = ?'); vals.push(summary) }
  if (goal) { sets.push('goal = ?'); vals.push(goal) }
  if (task_list) { sets.push('task_list_json = ?'); vals.push(JSON.stringify(task_list)) }
  if (prompt_text !== undefined) { sets.push('prompt_text = ?'); vals.push(prompt_text) }
  if (sets.length === 0) return res.json({ success: false, error: '无可更新字段' })
  sets.push("updated_at = datetime('now', 'localtime')")
  vals.push(req.params.sid)
  db.prepare(`UPDATE sessions SET ${sets.join(', ')} WHERE session_id = ?`).run(...vals)
  res.json({ success: true })
})

// ---- Session 垃圾篓操作 ----

app.get('/api/sessions/trashed/all', (_req, res) => {
  const sessions = db.prepare(
    `SELECT s.*, p.name as project_name, p.color as project_color
     FROM sessions s JOIN projects p ON s.project_id = p.project_id
     WHERE s.is_trashed = 1 ORDER BY s.updated_at DESC`
  ).all() as Record<string, unknown>[]
  const parsed = sessions.map(s => ({ ...s, task_list: JSON.parse((s.task_list_json as string) || '[]') }))
  res.json({ success: true, data: parsed })
})

app.patch('/api/sessions/:sid/trash', (req, res) => {
  db.prepare("UPDATE sessions SET is_trashed = 1, updated_at = datetime('now', 'localtime') WHERE session_id = ?").run(req.params.sid)
  res.json({ success: true })
})

app.patch('/api/sessions/:sid/restore', (req, res) => {
  db.prepare("UPDATE sessions SET is_trashed = 0, updated_at = datetime('now', 'localtime') WHERE session_id = ?").run(req.params.sid)
  res.json({ success: true })
})

app.delete('/api/sessions/:sid/permanent', (req, res) => {
  db.prepare('DELETE FROM task_updates WHERE session_id = ?').run(req.params.sid)
  db.prepare('DELETE FROM sessions WHERE session_id = ?').run(req.params.sid)
  res.json({ success: true })
})

app.delete('/api/sessions/trashed/clear', (_req, res) => {
  const trashed = db.prepare('SELECT session_id FROM sessions WHERE is_trashed = 1').all() as { session_id: string }[]
  for (const s of trashed) {
    db.prepare('DELETE FROM task_updates WHERE session_id = ?').run(s.session_id)
  }
  db.prepare('DELETE FROM sessions WHERE is_trashed = 1').run()
  res.json({ success: true, count: trashed.length })
})

// ---- 任务更新路由（核心） ----

app.post('/api/tasks/update', (req, res) => {
  const { project_id, session_id, task_id, type, task_name, task_plan, task_summary, content, task_list, goal, summary } = req.body
  if (!project_id || !session_id || !task_id || !type) return res.status(400).json({ success: false, error: '缺少必要字段' })
  const validTypes = ['session_start', 'task_start', 'task_progress', 'task_complete', 'session_complete']
  if (!validTypes.includes(type)) return res.status(400).json({ success: false, error: '无效 type' })
  const p = db.prepare('SELECT * FROM projects WHERE project_id = ?').get(project_id) as Record<string, unknown> | undefined
  if (!p) return res.status(404).json({ success: false, error: '项目不存在' })
  if (p.status !== 'visible') db.prepare("UPDATE projects SET status = 'visible', updated_at = datetime('now', 'localtime') WHERE project_id = ?").run(project_id)

  // session_start: 自动创建 Session
  if (type === 'session_start') {
    const exists = db.prepare('SELECT session_id FROM sessions WHERE session_id = ?').get(session_id)
    if (!exists) {
      db.prepare('INSERT INTO sessions (session_id, project_id, goal, task_list_json, status) VALUES (?, ?, ?, ?, ?)').run(session_id, project_id, goal || '', JSON.stringify(task_list || []), 'running')
    } else {
      const u: string[] = ["status = 'running'"]; const v: unknown[] = []
      if (goal) { u.push('goal = ?'); v.push(goal) }
      if (task_list) { u.push('task_list_json = ?'); v.push(JSON.stringify(task_list)) }
      u.push("updated_at = datetime('now', 'localtime')")
      v.push(session_id)
      db.prepare(`UPDATE sessions SET ${u.join(', ')} WHERE session_id = ?`).run(...v)
    }
  }
  if (task_list && type !== 'session_start') {
    db.prepare("UPDATE sessions SET task_list_json = ?, updated_at = datetime('now', 'localtime') WHERE session_id = ?").run(JSON.stringify(task_list), session_id)
  }
  if (type === 'session_complete') {
    db.prepare("UPDATE sessions SET status = 'completed', summary = ?, updated_at = datetime('now', 'localtime') WHERE session_id = ?").run(summary || task_summary || '', session_id)
  }

  db.prepare('INSERT INTO task_updates (task_id, session_id, project_id, type, task_name, task_plan, task_summary, content) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(task_id, session_id, project_id, type, task_name || '', task_plan || '', task_summary || '', content || '')
  db.prepare("UPDATE sessions SET updated_at = datetime('now', 'localtime') WHERE session_id = ?").run(session_id)
  db.prepare("UPDATE projects SET updated_at = datetime('now', 'localtime') WHERE project_id = ?").run(project_id)
  db.prepare('INSERT INTO notifications (project_id, type, content) VALUES (?, ?, ?)').run(project_id, type, task_name || task_summary || '')

  // 通知 Electron 主进程
  notifyParent({ type: 'task-update', data: { project_id, session_id, task_id, type, task_name } })

  // Socket.IO 广播
  if (io) io.emit('task-update', { project_id, session_id, task_id, type, timestamp: new Date().toISOString() })

  res.json({ success: true, type })
})

app.get('/api/tasks/:sid', (req, res) => {
  res.json({ success: true, data: db.prepare('SELECT * FROM task_updates WHERE session_id = ? ORDER BY created_at ASC').all(req.params.sid) })
})

// ---- 记忆管理路由 ----

app.get('/api/memories/:pid/categories', (req, res) => {
  res.json({ success: true, data: db.prepare('SELECT * FROM memory_categories WHERE project_id = ? ORDER BY sort_order ASC').all(req.params.pid) })
})

app.post('/api/memories/:pid/categories', (req, res) => {
  const { name, description } = req.body
  if (!name) return res.status(400).json({ success: false, error: '缺少分类名称' })
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM memory_categories WHERE project_id = ?').get(req.params.pid) as { m: number | null }
  db.prepare('INSERT OR IGNORE INTO memory_categories (project_id, name, description, sort_order) VALUES (?, ?, ?, ?)').run(req.params.pid, name, description || '', (maxOrder?.m || 0) + 1)
  res.json({ success: true })
})

app.put('/api/memories/:pid/categories/:cid', (req, res) => {
  const { name, description } = req.body
  const s: string[] = []; const v: unknown[] = []
  if (name) { s.push('name = ?'); v.push(name) }
  if (description !== undefined) { s.push('description = ?'); v.push(description) }
  if (s.length === 0) return res.status(400).json({ success: false, error: '无可更新字段' })
  v.push(req.params.cid)
  db.prepare(`UPDATE memory_categories SET ${s.join(', ')} WHERE id = ?`).run(...v)
  res.json({ success: true })
})

app.get('/api/memories/:pid/documents', (req, res) => {
  const cid = req.query.category_id ? Number(req.query.category_id) : undefined
  const docs = cid
    ? db.prepare('SELECT * FROM memory_documents WHERE project_id = ? AND category_id = ? ORDER BY updated_at DESC').all(req.params.pid, cid)
    : db.prepare('SELECT * FROM memory_documents WHERE project_id = ? ORDER BY updated_at DESC').all(req.params.pid)
  res.json({ success: true, data: docs })
})

app.get('/api/memories/:pid/documents/:did', (req, res) => {
  const doc = db.prepare('SELECT * FROM memory_documents WHERE id = ?').get(req.params.did) as Record<string, unknown> | undefined
  if (!doc) return res.status(404).json({ success: false, error: '文档不存在' })
  const fp = path.join(memoriesDir, req.params.pid, doc.file_path as string)
  const content = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf-8') : ''
  res.json({ success: true, data: { ...doc, content } })
})

app.post('/api/memories/:pid/documents', (req, res) => {
  const { category_id, title, file_name, content } = req.body
  if (!category_id || !title || !content) return res.status(400).json({ success: false, error: '缺少必要字段' })
  const pDir = path.join(memoriesDir, req.params.pid)
  if (!fs.existsSync(pDir)) fs.mkdirSync(pDir, { recursive: true })
  const fn = file_name || `${title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')}.md`
  fs.writeFileSync(path.join(pDir, fn), content, 'utf-8')
  const hash = crypto.createHash('md5').update(content).digest('hex')
  const existing = db.prepare('SELECT id FROM memory_documents WHERE project_id = ? AND file_path = ?').get(req.params.pid, fn) as { id: number } | undefined
  if (existing) {
    db.prepare("UPDATE memory_documents SET title = ?, content_hash = ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(title, hash, existing.id)
    res.json({ success: true, id: existing.id, action: 'updated' })
  } else {
    const r = db.prepare('INSERT INTO memory_documents (project_id, category_id, title, file_path, content_hash) VALUES (?, ?, ?, ?, ?)').run(req.params.pid, category_id, title, fn, hash)
    res.json({ success: true, id: r.lastInsertRowid, action: 'created' })
  }
})

app.put('/api/memories/:pid/documents/:did', (req, res) => {
  const { title, content } = req.body
  const doc = db.prepare('SELECT * FROM memory_documents WHERE id = ?').get(req.params.did) as Record<string, unknown> | undefined
  if (!doc) return res.status(404).json({ success: false, error: '文档不存在' })
  if (content !== undefined) {
    const fp = path.join(memoriesDir, req.params.pid, doc.file_path as string)
    fs.writeFileSync(fp, content, 'utf-8')
    const hash = crypto.createHash('md5').update(content).digest('hex')
    db.prepare("UPDATE memory_documents SET content_hash = ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(hash, req.params.did)
  }
  if (title) db.prepare("UPDATE memory_documents SET title = ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(title, req.params.did)
  res.json({ success: true })
})

app.delete('/api/memories/:pid/documents/:did', (req, res) => {
  const doc = db.prepare('SELECT * FROM memory_documents WHERE id = ?').get(req.params.did) as Record<string, unknown> | undefined
  if (doc) {
    const fp = path.join(memoriesDir, req.params.pid, doc.file_path as string)
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
  }
  db.prepare('DELETE FROM memory_documents WHERE id = ?').run(req.params.did)
  res.json({ success: true })
})

app.post('/api/memories/:pid/sync', (req, res) => {
  const { files } = req.body
  if (!Array.isArray(files)) return res.status(400).json({ success: false, error: 'files 必须为数组' })
  const pDir = path.join(memoriesDir, req.params.pid)
  if (!fs.existsSync(pDir)) fs.mkdirSync(pDir, { recursive: true })
  const results: unknown[] = []
  for (const f of files) {
    if (f.action === 'delete') {
      const fp = path.join(pDir, f.file_name)
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
      db.prepare('DELETE FROM memory_documents WHERE project_id = ? AND file_path = ?').run(req.params.pid, f.file_name)
      results.push({ file_name: f.file_name, action: 'deleted' })
    } else {
      const fp = path.join(pDir, f.file_name)
      fs.writeFileSync(fp, f.content, 'utf-8')
      const hash = crypto.createHash('md5').update(f.content).digest('hex')
      const existing = db.prepare('SELECT id FROM memory_documents WHERE project_id = ? AND file_path = ?').get(req.params.pid, f.file_name) as { id: number } | undefined
      if (existing) {
        db.prepare("UPDATE memory_documents SET title = ?, content_hash = ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(f.title, hash, existing.id)
        results.push({ file_name: f.file_name, action: 'updated' })
      } else {
        db.prepare('INSERT INTO memory_documents (project_id, category_id, title, file_path, content_hash) VALUES (?, ?, ?, ?, ?)').run(req.params.pid, f.category_id, f.title, f.file_name, hash)
        results.push({ file_name: f.file_name, action: 'created' })
      }
    }
  }
  res.json({ success: true, data: results })
})

// ---- 系统路由 ----

app.get('/api/settings', (_req, res) => {
  const rows = db.prepare('SELECT * FROM user_settings').all() as { key: string; value: string }[]
  const settings: Record<string, string> = {}
  for (const r of rows) settings[r.key] = r.value
  res.json({ success: true, data: settings })
})

app.put('/api/settings', (req, res) => {
  const stmt = db.prepare('INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)')
  for (const [k, v] of Object.entries(req.body)) stmt.run(k, v as string)
  res.json({ success: true })
})

app.get('/api/notifications/unread', (_req, res) => {
  res.json({ success: true, data: db.prepare('SELECT n.*, p.color, p.name as project_name FROM notifications n JOIN projects p ON n.project_id = p.project_id WHERE n.is_read = 0 ORDER BY n.created_at DESC').all() })
})

app.post('/api/notifications/read', (req, res) => {
  if (req.body.project_id) db.prepare('UPDATE notifications SET is_read = 1 WHERE project_id = ?').run(req.body.project_id)
  else db.prepare('UPDATE notifications SET is_read = 1').run()
  res.json({ success: true })
})

app.get('/api/recommendations', (_req, res) => {
  const active = db.prepare("SELECT p.*, s.session_id, s.goal, s.status as session_status FROM projects p JOIN sessions s ON p.project_id = s.project_id WHERE p.status = 'visible' AND s.status = 'running' ORDER BY s.updated_at DESC").all()
  const stale = db.prepare("SELECT * FROM projects WHERE status = 'visible' AND updated_at < datetime('now', '-1 day', 'localtime') AND updated_at > datetime('now', '-7 days', 'localtime') ORDER BY updated_at DESC LIMIT 5").all()
  const withPrompts = db.prepare("SELECT p.*, s.session_id, s.prompt_text FROM projects p JOIN sessions s ON p.project_id = s.project_id WHERE p.status = 'visible' AND s.prompt_text != '' AND s.prompt_text IS NOT NULL ORDER BY s.updated_at DESC").all()
  res.json({ success: true, data: { activeSessions: active, staleProjects: stale, withPrompts } })
})

app.get('/api/docs', (_req, res) => {
  res.json({ success: true, data: getApiDocs() })
})

// 前端日志上报接口，方便从浏览器/渲染进程回传调试信息
app.post('/api/frontend-log', (req, res) => {
  const { level, message } = req.body || {}
  console.log(`[Frontend:${level || 'LOG'}] ${message || ''}`)
  res.json({ success: true })
})

// 根路由：返回 CodeBoard 说明书 HTML 页面
app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(getDocumentationHTML())
})

// 404
app.use((_req, res) => { res.status(404).json({ success: false, error: 'API 路径不存在' }) })

// ---- 启动服务器 ----

const server = http.createServer(app)
const io = new SocketIOServer(server, { cors: { origin: '*' } })

io.on('connection', (socket) => {
  console.log(`[Socket.IO] 连接: ${socket.id}`)
  socket.on('disconnect', () => console.log(`[Socket.IO] 断开: ${socket.id}`))
})

// 监听失败时须处理 error，否则 Node 会抛出 Unhandled 'error' 并崩溃子进程
server.on('error', (err: NodeJS.ErrnoException) => {
  const code = err.code || ''
  console.error(`[CodeBoard-ERR] listen failed: ${code} ${err.message}`)
  if (code === 'EADDRINUSE') {
    // 主进程通过该标记识别端口占用，以便自动换端口或提示用户
    console.error(`[CodeBoard-ERR] EADDRINUSE ${HOST}:${PORT}`)
  }
  process.exit(1)
})

server.listen(PORT, HOST, () => {
  console.log(`[CodeBoard] API 服务已启动: http://${HOST}:${PORT}`)
  // 通知父进程（Electron）服务已就绪
  notifyParent({ type: 'server-ready', data: { host: HOST, port: PORT } })
})

// ---- IPC 通信 ----

function notifyParent(msg: unknown) {
  // 通过 stdout 向父进程发送简单通知（父进程监听 stdout）
  console.log(`[NOTIFY] ${JSON.stringify(msg)}`)
}

/** 生成 CodeBoard 说明书 HTML（访问 http://127.0.0.1:2585 时展示） */
function getDocumentationHTML(): string {
  // 从数据库读取实时统计
  const projectCount = (db.prepare('SELECT COUNT(*) as c FROM projects').get() as { c: number }).c
  const sessionCount = (db.prepare('SELECT COUNT(*) as c FROM sessions').get() as { c: number }).c
  const taskCount = (db.prepare('SELECT COUNT(*) as c FROM task_updates').get() as { c: number }).c
  const memoryCount = (db.prepare('SELECT COUNT(*) as c FROM memory_documents').get() as { c: number }).c

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeBoard - VibeCoding 多项目看板</title>
  <style>
    :root {
      --bg: #f5f5f7; --card: #fff; --text: #1d1d1f; --text2: #86868b;
      --accent: #007AFF; --border: rgba(0,0,0,0.06); --green: #34C759;
      --orange: #FF9500; --purple: #AF52DE; --red: #FF3B30;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1c1c1e; --card: #2c2c2e; --text: #f5f5f7; --text2: #98989d;
        --border: rgba(255,255,255,0.08);
      }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
      background: var(--bg); color: var(--text); line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    .container { max-width: 960px; margin: 0 auto; padding: 40px 24px; }
    /* 头部 */
    .hero { text-align: center; padding: 48px 0 32px; }
    .hero-icon {
      width: 80px; height: 80px; border-radius: 20px; margin: 0 auto 20px;
      background: linear-gradient(135deg, #007AFF, #5856D6);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 32px rgba(0,122,255,0.3);
    }
    .hero-icon svg { width: 44px; height: 44px; fill: #fff; }
    .hero h1 { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; }
    .hero p { color: var(--text2); font-size: 16px; margin-top: 8px; }
    .badge {
      display: inline-block; margin-top: 16px; padding: 4px 14px;
      border-radius: 20px; font-size: 12px; font-weight: 600;
      background: rgba(52,199,89,0.15); color: var(--green);
    }
    /* 统计卡片 */
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 32px 0; }
    .stat-card {
      background: var(--card); border-radius: 16px; padding: 20px; text-align: center;
      border: 1px solid var(--border); box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    }
    .stat-num { font-size: 28px; font-weight: 700; color: var(--accent); }
    .stat-label { font-size: 13px; color: var(--text2); margin-top: 4px; }
    /* 段落 */
    .section { margin: 36px 0; }
    .section h2 {
      font-size: 22px; font-weight: 700; margin-bottom: 16px;
      padding-bottom: 8px; border-bottom: 2px solid var(--accent);
      display: inline-block;
    }
    .section p { color: var(--text2); margin-bottom: 12px; }
    /* 架构图 */
    .arch {
      background: var(--card); border-radius: 16px; padding: 24px;
      border: 1px solid var(--border); font-family: 'SF Mono', Menlo, monospace;
      font-size: 13px; line-height: 1.8; white-space: pre; overflow-x: auto;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    }
    /* API 表格 */
    .api-group { margin-bottom: 24px; }
    .api-group h3 {
      font-size: 16px; font-weight: 600; margin-bottom: 8px;
      padding: 6px 12px; border-radius: 8px; display: inline-block;
    }
    .api-group:nth-child(1) h3 { background: rgba(0,122,255,0.1); color: var(--accent); }
    .api-group:nth-child(2) h3 { background: rgba(52,199,89,0.1); color: var(--green); }
    .api-group:nth-child(3) h3 { background: rgba(255,149,0,0.1); color: var(--orange); }
    .api-group:nth-child(4) h3 { background: rgba(175,82,222,0.1); color: var(--purple); }
    .api-group:nth-child(5) h3 { background: rgba(255,59,48,0.1); color: var(--red); }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td {
      padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border);
      font-size: 13px;
    }
    th { font-weight: 600; color: var(--text2); font-size: 12px; text-transform: uppercase; }
    .method {
      display: inline-block; padding: 2px 8px; border-radius: 4px;
      font-size: 11px; font-weight: 700; font-family: 'SF Mono', Menlo, monospace;
    }
    .method-get { background: rgba(52,199,89,0.15); color: var(--green); }
    .method-post { background: rgba(0,122,255,0.15); color: var(--accent); }
    .method-put { background: rgba(255,149,0,0.15); color: var(--orange); }
    .method-patch { background: rgba(175,82,222,0.15); color: var(--purple); }
    .method-delete { background: rgba(255,59,48,0.15); color: var(--red); }
    td code {
      font-family: 'SF Mono', Menlo, monospace; font-size: 12px;
      background: rgba(0,0,0,0.04); padding: 2px 6px; border-radius: 4px;
    }
    @media (prefers-color-scheme: dark) { td code { background: rgba(255,255,255,0.06); } }
    /* 快速开始 */
    .quick-start {
      background: var(--card); border-radius: 16px; padding: 24px;
      border: 1px solid var(--border); box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    }
    .step { display: flex; gap: 16px; margin-bottom: 20px; }
    .step:last-child { margin-bottom: 0; }
    .step-num {
      flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%;
      background: var(--accent); color: #fff; display: flex;
      align-items: center; justify-content: center; font-weight: 700; font-size: 14px;
    }
    .step-content h4 { font-size: 15px; font-weight: 600; }
    .step-content p { color: var(--text2); font-size: 13px; margin-top: 4px; }
    .code-block {
      background: #1e1e1e; color: #d4d4d4; border-radius: 8px; padding: 12px 16px;
      font-family: 'SF Mono', Menlo, monospace; font-size: 12px; margin-top: 8px;
      overflow-x: auto; line-height: 1.6;
    }
    .code-block .c { color: #6A9955; }
    .code-block .s { color: #CE9178; }
    .code-block .k { color: #569CD6; }
    /* Agent 适配 */
    .agent-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .agent-card {
      background: var(--card); border-radius: 12px; padding: 20px;
      border: 1px solid var(--border); text-align: center;
      transition: transform 0.2s, box-shadow 0.2s; cursor: default;
    }
    .agent-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
    .agent-card h4 { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
    .agent-card p { font-size: 12px; color: var(--text2); }
    /* Footer */
    footer {
      text-align: center; padding: 32px 0; color: var(--text2); font-size: 12px;
      border-top: 1px solid var(--border); margin-top: 48px;
    }
    @media (max-width: 640px) {
      .stats { grid-template-columns: repeat(2, 1fr); }
      .agent-cards { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- 头部 -->
    <div class="hero">
      <div class="hero-icon">
        <svg viewBox="0 0 24 24"><path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-2a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"/></svg>
      </div>
      <h1>CodeBoard</h1>
      <p>VibeCoding 多项目看板 — 管理多个 AI Agent 项目的桌面应用</p>
      <span class="badge">API 服务运行中 · ${HOST}:${PORT}</span>
    </div>

    <!-- 实时统计 -->
    <div class="stats">
      <div class="stat-card"><div class="stat-num">${projectCount}</div><div class="stat-label">项目</div></div>
      <div class="stat-card"><div class="stat-num">${sessionCount}</div><div class="stat-label">Session</div></div>
      <div class="stat-card"><div class="stat-num">${taskCount}</div><div class="stat-label">任务更新</div></div>
      <div class="stat-card"><div class="stat-num">${memoryCount}</div><div class="stat-label">记忆文档</div></div>
    </div>

    <!-- 架构说明 -->
    <div class="section">
      <h2>系统架构</h2>
      <div class="arch">┌─────────────────────────────────────────────┐
│           Electron Desktop App              │
│  ┌──────────────┐  ┌─────────────────────┐  │
│  │ Main Process  │  │ Renderer (React)    │  │
│  │  Express API  │←→│  Zustand + Framer   │  │
│  │  Socket.IO    │→→│  Motion + Tailwind  │  │
│  │  SQLite DB    │  └─────────────────────┘  │
│  └──────────────┘                            │
└──────────────────┬──────────────────────────┘
                   │ HTTP API (:${PORT})
       ┌───────────┼───────────┐
       ↓           ↓           ↓
  ┌─────────┐ ┌─────────┐ ┌────────┐
  │ Cursor  │ │ Claude  │ │  CLI   │
  │ Agent   │ │  Code   │ │  Tool  │
  └─────────┘ └─────────┘ └────────┘</div>
    </div>

    <!-- 快速开始 -->
    <div class="section">
      <h2>快速开始</h2>
      <div class="quick-start">
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-content">
            <h4>注册项目</h4>
            <p>通过 API 或 CLI 注册你的第一个项目</p>
            <div class="code-block"><span class="c"># 使用 curl</span>
curl -X POST http://${HOST}:${PORT}/api/projects/register \\
  -H <span class="s">"Content-Type: application/json"</span> \\
  -d <span class="s">'{"project_id":"proj_001","name":"我的项目","description":"项目描述"}'</span>

<span class="c"># 或使用 CLI</span>
codeboard project register --name <span class="s">"我的项目"</span></div>
          </div>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div class="step-content">
            <h4>推送任务更新</h4>
            <p>Agent 在执行任务时推送状态到看板</p>
            <div class="code-block">curl -X POST http://${HOST}:${PORT}/api/tasks/update \\
  -H <span class="s">"Content-Type: application/json"</span> \\
  -d <span class="s">'{"project_id":"proj_001","session_id":"sess_001",
       "task_id":"task_001","type":"task_start",
       "task_name":"实现登录功能"}'</span></div>
          </div>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div class="step-content">
            <h4>在看板中查看</h4>
            <p>打开 CodeBoard 桌面应用，实时查看所有项目的进度和状态</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Agent 支持 -->
    <div class="section">
      <h2>支持的 AI Agent</h2>
      <div class="agent-cards">
        <div class="agent-card">
          <h4>Cursor Agent</h4>
          <p>通过 Skill 文件自动对接，支持全局或项目级安装</p>
        </div>
        <div class="agent-card">
          <h4>Claude Code</h4>
          <p>通过 CLAUDE.md 配置，支持项目级和全局指令</p>
        </div>
        <div class="agent-card">
          <h4>CLI 工具</h4>
          <p>codeboard 命令行工具，快速管理项目和任务</p>
        </div>
      </div>
    </div>

    <!-- API 文档 -->
    <div class="section">
      <h2>API 接口文档</h2>

      <div class="api-group">
        <h3>项目管理</h3>
        <table>
          <tr><th>方法</th><th>路径</th><th>说明</th></tr>
          <tr><td><span class="method method-post">POST</span></td><td><code>/api/projects/register</code></td><td>注册新项目</td></tr>
          <tr><td><span class="method method-get">GET</span></td><td><code>/api/projects</code></td><td>获取所有项目</td></tr>
          <tr><td><span class="method method-get">GET</span></td><td><code>/api/projects/:id</code></td><td>获取项目详情</td></tr>
          <tr><td><span class="method method-put">PUT</span></td><td><code>/api/projects/:id</code></td><td>更新项目信息</td></tr>
          <tr><td><span class="method method-patch">PATCH</span></td><td><code>/api/projects/:id/status</code></td><td>修改项目状态</td></tr>
          <tr><td><span class="method method-patch">PATCH</span></td><td><code>/api/projects/:id/color</code></td><td>修改项目颜色</td></tr>
          <tr><td><span class="method method-delete">DELETE</span></td><td><code>/api/projects/:id</code></td><td>永久删除项目</td></tr>
        </table>
      </div>

      <div class="api-group">
        <h3>Session 管理</h3>
        <table>
          <tr><th>方法</th><th>路径</th><th>说明</th></tr>
          <tr><td><span class="method method-post">POST</span></td><td><code>/api/sessions</code></td><td>创建新 Session</td></tr>
          <tr><td><span class="method method-get">GET</span></td><td><code>/api/sessions/:projectId</code></td><td>获取 Session 列表</td></tr>
          <tr><td><span class="method method-put">PUT</span></td><td><code>/api/sessions/:sessionId</code></td><td>更新 Session</td></tr>
        </table>
      </div>

      <div class="api-group">
        <h3>任务更新 (Agent 核心接口)</h3>
        <table>
          <tr><th>方法</th><th>路径</th><th>说明</th></tr>
          <tr><td><span class="method method-post">POST</span></td><td><code>/api/tasks/update</code></td><td>推送任务状态更新</td></tr>
          <tr><td><span class="method method-get">GET</span></td><td><code>/api/tasks/:sessionId</code></td><td>获取任务更新记录</td></tr>
        </table>
      </div>

      <div class="api-group">
        <h3>记忆管理</h3>
        <table>
          <tr><th>方法</th><th>路径</th><th>说明</th></tr>
          <tr><td><span class="method method-get">GET</span></td><td><code>/api/memories/:pid/categories</code></td><td>获取记忆分类</td></tr>
          <tr><td><span class="method method-post">POST</span></td><td><code>/api/memories/:pid/categories</code></td><td>创建分类</td></tr>
          <tr><td><span class="method method-get">GET</span></td><td><code>/api/memories/:pid/documents</code></td><td>获取文档列表</td></tr>
          <tr><td><span class="method method-post">POST</span></td><td><code>/api/memories/:pid/documents</code></td><td>创建文档</td></tr>
          <tr><td><span class="method method-put">PUT</span></td><td><code>/api/memories/:pid/documents/:did</code></td><td>更新文档</td></tr>
          <tr><td><span class="method method-delete">DELETE</span></td><td><code>/api/memories/:pid/documents/:did</code></td><td>删除文档</td></tr>
          <tr><td><span class="method method-post">POST</span></td><td><code>/api/memories/:pid/sync</code></td><td>批量同步记忆</td></tr>
        </table>
      </div>

      <div class="api-group">
        <h3>系统</h3>
        <table>
          <tr><th>方法</th><th>路径</th><th>说明</th></tr>
          <tr><td><span class="method method-get">GET</span></td><td><code>/api/health</code></td><td>健康检查</td></tr>
          <tr><td><span class="method method-get">GET</span></td><td><code>/api/settings</code></td><td>获取设置</td></tr>
          <tr><td><span class="method method-put">PUT</span></td><td><code>/api/settings</code></td><td>更新设置</td></tr>
          <tr><td><span class="method method-get">GET</span></td><td><code>/api/recommendations</code></td><td>推荐任务</td></tr>
          <tr><td><span class="method method-get">GET</span></td><td><code>/api/notifications/unread</code></td><td>未读通知</td></tr>
          <tr><td><span class="method method-get">GET</span></td><td><code>/api/docs</code></td><td>API 文档 (JSON)</td></tr>
        </table>
      </div>
    </div>

    <!-- 数据流 -->
    <div class="section">
      <h2>数据流</h2>
      <div class="quick-start">
        <div class="step"><div class="step-num" style="background:var(--accent)">1</div><div class="step-content"><h4>Agent → API</h4><p>AI Agent 通过 HTTP POST 推送任务状态更新到 Express API</p></div></div>
        <div class="step"><div class="step-num" style="background:var(--green)">2</div><div class="step-content"><h4>API → SQLite</h4><p>Express 路由处理请求，将数据持久化到 SQLite 数据库</p></div></div>
        <div class="step"><div class="step-num" style="background:var(--orange)">3</div><div class="step-content"><h4>API → Socket.IO → Renderer</h4><p>通过 Socket.IO 广播实时事件，React 前端接收并更新 UI</p></div></div>
        <div class="step"><div class="step-num" style="background:var(--purple)">4</div><div class="step-content"><h4>Main → System</h4><p>Electron 主进程调用系统 API 发送 macOS 原生通知</p></div></div>
      </div>
    </div>

    <footer>
      CodeBoard v1.0.0 · 服务运行于 http://${HOST}:${PORT} · 
      <a href="/api/health" style="color:var(--accent)">健康检查</a> · 
      <a href="/api/docs" style="color:var(--accent)">API 文档 (JSON)</a>
    </footer>
  </div>
</body>
</html>`
}

function getApiDocs() {
  return [
    { group: '项目管理', apis: [
      { method: 'POST', path: '/api/projects/register', description: '注册新项目', body: { project_id: 'string', name: 'string', description: 'string' } },
      { method: 'GET', path: '/api/projects', description: '获取所有项目' },
      { method: 'GET', path: '/api/projects/:projectId', description: '获取项目详情' },
      { method: 'PUT', path: '/api/projects/:projectId', description: '更新项目', body: { name: 'string', description: 'string' } },
      { method: 'PATCH', path: '/api/projects/:projectId/status', description: '修改状态', body: { status: 'visible|hidden|trashed' } },
      { method: 'PATCH', path: '/api/projects/:projectId/color', description: '修改颜色', body: { color: '#HEX' } },
      { method: 'POST', path: '/api/projects/:projectId/test', description: '测试连接' },
      { method: 'DELETE', path: '/api/projects/:projectId', description: '永久删除' }
    ]},
    { group: 'Session', apis: [
      { method: 'POST', path: '/api/sessions', description: '创建Session', body: { session_id: 'string', project_id: 'string', goal: 'string', task_list: 'array' } },
      { method: 'GET', path: '/api/sessions/:projectId', description: '获取Session列表' },
      { method: 'PUT', path: '/api/sessions/:sessionId', description: '更新Session' }
    ]},
    { group: '任务更新', apis: [
      { method: 'POST', path: '/api/tasks/update', description: '推送任务更新', body: { project_id: 'string', session_id: 'string', task_id: 'string', type: 'session_start|task_start|task_progress|task_complete|session_complete' } },
      { method: 'GET', path: '/api/tasks/:sessionId', description: '获取更新记录' }
    ]},
    { group: '记忆管理', apis: [
      { method: 'GET', path: '/api/memories/:projectId/categories', description: '获取分类' },
      { method: 'POST', path: '/api/memories/:projectId/categories', description: '创建分类' },
      { method: 'GET', path: '/api/memories/:projectId/documents', description: '获取文档列表' },
      { method: 'POST', path: '/api/memories/:projectId/documents', description: '创建文档' },
      { method: 'PUT', path: '/api/memories/:projectId/documents/:docId', description: '更新文档' },
      { method: 'DELETE', path: '/api/memories/:projectId/documents/:docId', description: '删除文档' },
      { method: 'POST', path: '/api/memories/:projectId/sync', description: '批量同步' }
    ]},
    { group: '系统', apis: [
      { method: 'GET', path: '/api/health', description: '健康检查' },
      { method: 'GET', path: '/api/recommendations', description: '推荐任务' },
      { method: 'GET', path: '/api/settings', description: '获取设置' },
      { method: 'PUT', path: '/api/settings', description: '更新设置' },
      { method: 'GET', path: '/api/docs', description: 'API文档' }
    ]}
  ]
}
