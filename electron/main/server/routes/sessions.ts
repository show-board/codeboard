// ============================================================
// Session 管理路由
// 处理 Session 创建、查询、更新、提示词管理
// ============================================================

import { Router, Request, Response } from 'express'
import * as db from '../../db'

const router = Router()

/** POST /api/sessions - 创建新 Session */
router.post('/', (req: Request, res: Response) => {
  const { session_id, project_id, goal, task_list } = req.body
  if (!session_id || !project_id) {
    return res.status(400).json({ success: false, error: '缺少必要字段: session_id, project_id' })
  }
  // 检查项目是否存在
  const project = db.getProject(project_id)
  if (!project) {
    return res.status(404).json({ success: false, error: '关联项目不存在' })
  }
  // 如果项目被隐藏或丢弃，自动恢复为可见
  const p = project as Record<string, unknown>
  if (p.status !== 'visible') {
    db.updateProject(project_id, { status: 'visible' })
  }
  const result = db.createSession(session_id, project_id, goal || '', task_list || [])
  res.json(result)
})

/** GET /api/sessions/:projectId - 获取项目的所有 Session */
router.get('/:projectId', (req: Request, res: Response) => {
  const sessions = db.getSessionsByProject(req.params.projectId)
  // 解析 task_list_json 为对象
  const parsed = (sessions as Record<string, unknown>[]).map(s => ({
    ...s,
    task_list: JSON.parse((s.task_list_json as string) || '[]')
  }))
  res.json({ success: true, data: parsed })
})

/** PUT /api/sessions/:sessionId - 更新 Session 状态/总结 */
router.put('/:sessionId', (req: Request, res: Response) => {
  const { status, summary, goal, task_list, prompt_text } = req.body
  const fields: Record<string, unknown> = {}
  if (status) fields.status = status
  if (summary) fields.summary = summary
  if (goal) fields.goal = goal
  if (task_list) fields.task_list = task_list
  if (prompt_text !== undefined) fields.prompt_text = prompt_text
  const result = db.updateSession(req.params.sessionId, fields)
  res.json(result)
})

/** GET /api/sessions/trashed/all - 获取所有已回收的 Sessions */
router.get('/trashed/all', (_req: Request, res: Response) => {
  const sessions = db.getTrashedSessions()
  const parsed = (sessions as Record<string, unknown>[]).map(s => ({
    ...s,
    task_list: JSON.parse((s.task_list_json as string) || '[]')
  }))
  res.json({ success: true, data: parsed })
})

/** PATCH /api/sessions/:sessionId/trash - 将 Session 移入垃圾篓 */
router.patch('/:sessionId/trash', (req: Request, res: Response) => {
  const result = db.trashSession(req.params.sessionId)
  res.json(result)
})

/** PATCH /api/sessions/:sessionId/restore - 从垃圾篓恢复 Session */
router.patch('/:sessionId/restore', (req: Request, res: Response) => {
  const result = db.restoreSession(req.params.sessionId)
  res.json(result)
})

/** DELETE /api/sessions/:sessionId/permanent - 永久删除 Session */
router.delete('/:sessionId/permanent', (req: Request, res: Response) => {
  const result = db.permanentDeleteSession(req.params.sessionId)
  res.json(result)
})

/** DELETE /api/sessions/trashed/clear - 清空所有已回收的 Sessions */
router.delete('/trashed/clear', (_req: Request, res: Response) => {
  const result = db.clearTrashedSessions()
  res.json(result)
})

export default router
