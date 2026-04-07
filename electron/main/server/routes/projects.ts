// ============================================================
// 项目管理路由
// 处理项目注册、查询、更新、状态变更、颜色设置、删除等操作
// ============================================================

import { Router, Request, Response } from 'express'
import * as db from '../../db'

const router = Router()

/** POST /api/projects/register - 注册新项目（校验唯一性） */
router.post('/register', (req: Request, res: Response) => {
  const { project_id, name, description } = req.body
  if (!project_id || !name) {
    return res.status(400).json({ success: false, error: '缺少必要字段: project_id, name' })
  }
  const result = db.createProject(project_id, name, description || '')
  if (!result.success) {
    return res.status(409).json(result)
  }
  res.json(result)
})

/** POST /api/projects/:projectId/test - 测试项目连接可用性 */
router.post('/:projectId/test', (req: Request, res: Response) => {
  const project = db.getProject(req.params.projectId)
  if (!project) {
    return res.status(404).json({ success: false, error: '项目不存在', available: false })
  }
  res.json({ success: true, available: true, project })
})

/** GET /api/projects - 获取所有项目列表 */
router.get('/', (_req: Request, res: Response) => {
  const projects = db.getAllProjects()
  res.json({ success: true, data: projects })
})

/** GET /api/projects/:projectId - 获取单个项目详情 */
router.get('/:projectId', (req: Request, res: Response) => {
  const project = db.getProject(req.params.projectId)
  if (!project) {
    return res.status(404).json({ success: false, error: '项目不存在' })
  }
  res.json({ success: true, data: project })
})

/** PUT /api/projects/:projectId - 更新项目名称/描述 */
router.put('/:projectId', (req: Request, res: Response) => {
  const { name, description } = req.body
  const fields: Record<string, string> = {}
  if (name) fields.name = name
  if (description !== undefined) fields.description = description
  const result = db.updateProject(req.params.projectId, fields)
  res.json(result)
})

/** PATCH /api/projects/:projectId/status - 修改项目显示状态 */
router.patch('/:projectId/status', (req: Request, res: Response) => {
  const { status } = req.body
  if (!['visible', 'hidden', 'trashed'].includes(status)) {
    return res.status(400).json({ success: false, error: '无效状态，可选: visible / hidden / trashed' })
  }
  const result = db.updateProject(req.params.projectId, { status })
  res.json(result)
})

/** PATCH /api/projects/:projectId/color - 修改项目专属色 */
router.patch('/:projectId/color', (req: Request, res: Response) => {
  const { color } = req.body
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return res.status(400).json({ success: false, error: '无效颜色格式，需要 HEX 格式如 #FF0000' })
  }
  const result = db.updateProject(req.params.projectId, { color })
  res.json(result)
})

/** DELETE /api/projects/:projectId - 永久删除项目（仅垃圾篓中的可删除） */
router.delete('/:projectId', (req: Request, res: Response) => {
  const project = db.getProject(req.params.projectId) as Record<string, unknown> | undefined
  if (!project) {
    return res.status(404).json({ success: false, error: '项目不存在' })
  }
  if (project.status !== 'trashed') {
    return res.status(400).json({ success: false, error: '只能删除垃圾篓中的项目，请先将项目移入垃圾篓' })
  }
  const result = db.deleteProject(req.params.projectId)
  res.json(result)
})

export default router
