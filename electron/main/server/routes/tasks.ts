// ============================================================
// 任务更新路由
// 核心接口：接收 Agent 推送的任务状态变更，更新看板并触发通知
// ============================================================

import { Router, Request, Response } from 'express'
import * as db from '../../db'

const router = Router()

/**
 * POST /api/tasks/update - 推送任务状态更新（Agent 核心调用接口）
 * 
 * 根据 type 字段执行不同逻辑：
 * - session_start: 创建或激活 Session，更新项目可见性
 * - task_start / task_progress / task_complete: 记录任务状态变更
 * - session_complete: 标记 Session 完成，记录总结信息
 */
router.post('/update', (req: Request, res: Response) => {
  const {
    project_id, session_id, task_id, type,
    task_name, task_plan, task_summary, content,
    task_list, goal, summary
  } = req.body

  // 校验必要字段
  if (!project_id || !session_id || !task_id || !type) {
    return res.status(400).json({
      success: false,
      error: '缺少必要字段: project_id, session_id, task_id, type'
    })
  }

  // 校验 type 合法性
  const validTypes = ['session_start', 'task_start', 'task_progress', 'task_complete', 'session_complete']
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: `无效的 type 值，可选: ${validTypes.join(', ')}`
    })
  }

  // 检查项目是否存在
  const project = db.getProject(project_id)
  if (!project) {
    return res.status(404).json({ success: false, error: '项目不存在，请先注册' })
  }

  // 如果项目被隐藏/丢弃，API 调用时自动恢复可见
  const p = project as Record<string, unknown>
  if (p.status !== 'visible') {
    db.updateProject(project_id, { status: 'visible' })
  }

  // 如果是 session_start，自动创建 Session（如果不存在）
  if (type === 'session_start') {
    const existingSessions = db.getSessionsByProject(project_id) as Record<string, unknown>[]
    const sessionExists = existingSessions.some(s => s.session_id === session_id)
    if (!sessionExists) {
      db.createSession(session_id, project_id, goal || '', task_list || [])
    } else {
      // 更新已有 session 的信息
      const updateFields: Record<string, unknown> = { status: 'running' }
      if (goal) updateFields.goal = goal
      if (task_list) updateFields.task_list = task_list
      db.updateSession(session_id, updateFields)
    }
  }

  // 如果更新了任务列表，同步到 Session
  if (task_list && type !== 'session_start') {
    db.updateSession(session_id, { task_list })
  }

  // session_complete 时更新 Session 总结和状态
  // 优先使用 summary 字段，其次用 task_summary 作为回退
  if (type === 'session_complete') {
    const sessionSummary = summary || task_summary || ''
    db.updateSession(session_id, { summary: sessionSummary, status: 'completed' })
  }

  // 构建增强的 content 字段，确保每步详情信息都被完整记录
  let enrichedContent = content || ''
  if (type === 'session_start' && !content) {
    const parts: Record<string, unknown> = {}
    if (goal) parts.goal = goal
    if (task_list && task_list.length > 0) parts.task_list = task_list
    enrichedContent = Object.keys(parts).length > 0 ? JSON.stringify(parts) : ''
  }
  if (type === 'session_complete' && !content) {
    const sessionSummary2 = summary || task_summary || ''
    if (sessionSummary2) enrichedContent = sessionSummary2
  }

  // 记录任务更新
  const result = db.addTaskUpdate({
    task_id, session_id, project_id, type,
    task_name, task_plan, task_summary, content: enrichedContent
  })

  // 创建通知
  db.addNotification(project_id, type, task_name || task_summary || content || '')

  res.json({ ...result, type })
})

/** GET /api/tasks/:sessionId - 获取 Session 的所有任务更新记录，附带 Session 概要信息 */
router.get('/:sessionId', (req: Request, res: Response) => {
  const updates = db.getTaskUpdatesBySession(req.params.sessionId)
  const session = db.getSessionBySessionId(req.params.sessionId)
  // 解析 task_list_json
  let sessionInfo = null
  if (session) {
    const s = session as Record<string, unknown>
    sessionInfo = {
      ...s,
      task_list: JSON.parse((s.task_list_json as string) || '[]')
    }
  }
  res.json({ success: true, data: updates, session: sessionInfo })
})

export default router
