// ============================================================
// 记忆文件管理服务
// 处理 Markdown 记忆文件的读写、同步和索引维护
// ============================================================

import path from 'path'
import fs from 'fs'
import { getMemoriesDir } from '../db'

/** 确保项目记忆目录存在 */
export function ensureProjectMemoryDir(projectId: string): string {
  const memoriesDir = getMemoriesDir()
  const projectDir = path.join(memoriesDir, projectId)
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true })
  }
  return projectDir
}

/** 读取记忆文件内容 */
export function readMemoryFile(projectId: string, fileName: string): string | null {
  const projectDir = ensureProjectMemoryDir(projectId)
  const filePath = path.join(projectDir, fileName)
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8')
  }
  return null
}

/** 写入记忆文件 */
export function writeMemoryFile(projectId: string, fileName: string, content: string): void {
  const projectDir = ensureProjectMemoryDir(projectId)
  const filePath = path.join(projectDir, fileName)
  fs.writeFileSync(filePath, content, 'utf-8')
}

/** 列出项目下的所有记忆文件 */
export function listMemoryFiles(projectId: string): string[] {
  const projectDir = ensureProjectMemoryDir(projectId)
  if (!fs.existsSync(projectDir)) return []
  return fs.readdirSync(projectDir).filter(f => f.endsWith('.md'))
}

/** 删除记忆文件 */
export function deleteMemoryFile(projectId: string, fileName: string): boolean {
  const projectDir = ensureProjectMemoryDir(projectId)
  const filePath = path.join(projectDir, fileName)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
    return true
  }
  return false
}
