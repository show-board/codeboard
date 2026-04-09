// ============================================================
// Hooks 事件路由
// 接收多 Agent hooks 事件并提供 session 维度统计查询
// ============================================================

import { Router, Request, Response } from 'express'
import * as db from '../../db'

const router = Router()

/** POST /api/hooks/events - 上报单条 hooks 事件 */
router.post('/events', (req: Request, res: Response) => {
  const {
    project_id,
    session_id,
    agent_type,
    hook_event_name,
    status,
    payload
  } = req.body

  if (!project_id || !session_id || !hook_event_name) {
    return res.status(400).json({
      success: false,
      error: '缺少必要字段: project_id, session_id, hook_event_name'
    })
  }

  // 项目必须存在（首次初始化仍需手动完成）
  const project = db.getProject(project_id)
  if (!project) {
    return res.status(404).json({
      success: false,
      error: '项目不存在，请先完成 project 初始化与注册'
    })
  }

  // hooks 事件可能先于 session_start 到达，这里做一次兜底自动建 session
  const session = db.getSessionBySessionId(session_id)
  if (!session) {
    db.createSession(session_id, project_id, 'hooks 自动创建 session', [])
  }

  const result = db.addHookEvent({
    project_id,
    session_id,
    agent_type,
    hook_event_name,
    status: status === 'error' ? 'error' : 'success',
    payload: typeof payload === 'object' && payload !== null ? payload : {}
  })

  res.json(result)
})

/** GET /api/hooks/sessions/:sessionId - 获取某个 session 的 hooks 统计与明细 */
router.get('/sessions/:sessionId', (req: Request, res: Response) => {
  const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit
  const limit = Math.min(Math.max(Number(rawLimit || 300), 1), 1000)
  const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId

  const stats = db.getHookStatsBySession(sessionId)
  const events = db.getHookEventsBySession(sessionId, limit) as Record<string, unknown>[]

  // payload_json 转对象，方便前端直接渲染
  const parsedEvents = events.map(event => {
    let parsedPayload: unknown = {}
    try {
      parsedPayload = JSON.parse(String(event.payload_json || '{}'))
    } catch {
      parsedPayload = {}
    }
    return {
      ...event,
      payload: parsedPayload
    }
  })

  res.json({
    success: true,
    data: {
      stats,
      events: parsedEvents
    }
  })
})

export default router

