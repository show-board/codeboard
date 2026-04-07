// ============================================================
// 记忆管理路由
// 处理记忆分类和文档的 CRUD，以及 Agent 的记忆同步
// ============================================================

import { Router, Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import * as db from '../../db'
import { getMemoriesDir } from '../../db'

const router = Router()

/** GET /api/memories/:projectId/categories - 获取记忆分类表 */
router.get('/:projectId/categories', (req: Request, res: Response) => {
  const categories = db.getMemoryCategories(req.params.projectId)
  res.json({ success: true, data: categories })
})

/** POST /api/memories/:projectId/categories - 创建新分类 */
router.post('/:projectId/categories', (req: Request, res: Response) => {
  const { name, description } = req.body
  if (!name) {
    return res.status(400).json({ success: false, error: '缺少分类名称' })
  }
  const result = db.createMemoryCategory(req.params.projectId, name, description || '')
  res.json(result)
})

/** PUT /api/memories/:projectId/categories/:categoryId - 更新分类信息 */
router.put('/:projectId/categories/:categoryId', (req: Request, res: Response) => {
  const { name, description } = req.body
  const dbInstance = db.getDb()
  const sets: string[] = []
  const values: unknown[] = []
  if (name) { sets.push('name = ?'); values.push(name) }
  if (description !== undefined) { sets.push('description = ?'); values.push(description) }
  if (sets.length === 0) {
    return res.status(400).json({ success: false, error: '无可更新字段' })
  }
  values.push(req.params.categoryId)
  dbInstance.prepare(`UPDATE memory_categories SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  res.json({ success: true })
})

/** GET /api/memories/:projectId/documents - 获取所有记忆文档列表 */
router.get('/:projectId/documents', (req: Request, res: Response) => {
  const categoryId = req.query.category_id ? Number(req.query.category_id) : undefined
  const documents = db.getMemoryDocuments(req.params.projectId, categoryId)
  res.json({ success: true, data: documents })
})

/** GET /api/memories/:projectId/documents/:docId - 读取单个记忆文档内容 */
router.get('/:projectId/documents/:docId', (req: Request, res: Response) => {
  const dbInstance = db.getDb()
  const doc = dbInstance.prepare('SELECT * FROM memory_documents WHERE id = ?').get(req.params.docId) as Record<string, unknown> | undefined
  if (!doc) {
    return res.status(404).json({ success: false, error: '文档不存在' })
  }

  // 从文件系统读取实际内容
  const memoriesDir = getMemoriesDir()
  const filePath = path.join(memoriesDir, req.params.projectId, doc.file_path as string)
  let content = ''
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf-8')
  }

  res.json({ success: true, data: { ...doc, content } })
})

/** POST /api/memories/:projectId/documents - 创建/更新记忆文档 */
router.post('/:projectId/documents', (req: Request, res: Response) => {
  const { category_id, title, file_name, content } = req.body
  if (!category_id || !title || !content) {
    return res.status(400).json({ success: false, error: '缺少必要字段: category_id, title, content' })
  }

  const projectId = req.params.projectId
  const memoriesDir = getMemoriesDir()
  const projectDir = path.join(memoriesDir, projectId)
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true })
  }

  // 文件名默认使用 title 的 slug 形式
  const fileName = file_name || `${title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')}.md`
  const filePath = path.join(projectDir, fileName)

  // 写入文件
  fs.writeFileSync(filePath, content, 'utf-8')

  // 计算内容哈希
  const contentHash = crypto.createHash('md5').update(content).digest('hex')

  // 更新数据库索引
  const result = db.upsertMemoryDocument(projectId, category_id, title, fileName, contentHash)
  res.json(result)
})

/** PUT /api/memories/:projectId/documents/:docId - 更新记忆文档内容 */
router.put('/:projectId/documents/:docId', (req: Request, res: Response) => {
  const { title, content } = req.body
  const dbInstance = db.getDb()
  const doc = dbInstance.prepare('SELECT * FROM memory_documents WHERE id = ?').get(req.params.docId) as Record<string, unknown> | undefined
  if (!doc) {
    return res.status(404).json({ success: false, error: '文档不存在' })
  }

  // 更新文件内容
  if (content !== undefined) {
    const memoriesDir = getMemoriesDir()
    const filePath = path.join(memoriesDir, req.params.projectId, doc.file_path as string)
    fs.writeFileSync(filePath, content, 'utf-8')
    const contentHash = crypto.createHash('md5').update(content).digest('hex')
    dbInstance.prepare(
      "UPDATE memory_documents SET content_hash = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
    ).run(contentHash, req.params.docId)
  }

  // 更新标题
  if (title) {
    dbInstance.prepare(
      "UPDATE memory_documents SET title = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
    ).run(title, req.params.docId)
  }

  res.json({ success: true })
})

/** DELETE /api/memories/:projectId/documents/:docId - 删除记忆文档 */
router.delete('/:projectId/documents/:docId', (req: Request, res: Response) => {
  const dbInstance = db.getDb()
  const doc = dbInstance.prepare('SELECT * FROM memory_documents WHERE id = ?').get(req.params.docId) as Record<string, unknown> | undefined
  if (doc) {
    // 删除物理文件
    const memoriesDir = getMemoriesDir()
    const filePath = path.join(memoriesDir, req.params.projectId, doc.file_path as string)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }
  const result = db.deleteMemoryDocument(Number(req.params.docId))
  res.json(result)
})

/** POST /api/memories/:projectId/sync - 批量同步记忆文件 */
router.post('/:projectId/sync', (req: Request, res: Response) => {
  const { files } = req.body
  if (!Array.isArray(files)) {
    return res.status(400).json({ success: false, error: 'files 必须为数组' })
  }

  const projectId = req.params.projectId
  const memoriesDir = getMemoriesDir()
  const projectDir = path.join(memoriesDir, projectId)
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true })
  }

  const results: unknown[] = []
  for (const file of files) {
    const { category_id, title, file_name, content, action } = file

    if (action === 'delete') {
      // 删除文件
      const filePath = path.join(projectDir, file_name)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      const dbInstance = db.getDb()
      dbInstance.prepare('DELETE FROM memory_documents WHERE project_id = ? AND file_path = ?')
        .run(projectId, file_name)
      results.push({ file_name, action: 'deleted' })
    } else {
      // 创建或更新文件
      const filePath = path.join(projectDir, file_name)
      fs.writeFileSync(filePath, content, 'utf-8')
      const contentHash = crypto.createHash('md5').update(content).digest('hex')
      const result = db.upsertMemoryDocument(projectId, category_id, title, file_name, contentHash)
      results.push({ file_name, ...result })
    }
  }

  res.json({ success: true, data: results })
})

export default router
