// ============================================================
// codeboard memory 命令
// 管理项目记忆：列出分类、获取文档、推送文件、同步
// ============================================================

import { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { apiGet, apiPost, apiPut } from '../utils/api'

export function registerMemoryCommand(program: Command) {
  const memory = program.command('memory').description('项目记忆管理')

  // 列出记忆分类
  memory
    .command('list <projectId>')
    .description('列出项目的记忆分类')
    .action(async (projectId) => {
      try {
        const result = await apiGet(`/api/memories/${projectId}/categories`) as Record<string, unknown>
        const categories = result.data as Record<string, unknown>[]
        if (!categories || categories.length === 0) {
          console.log('📭 暂无记忆分类')
          return
        }
        console.log(`🧠 项目 ${projectId} 的记忆分类:\n`)
        for (const cat of categories) {
          console.log(`  📁 [${cat.id}] ${cat.name} - ${cat.description}`)
        }
      } catch (err) {
        console.error('❌', (err as Error).message)
      }
    })

  // 获取某分类下的记忆文档
  memory
    .command('get <projectId> <categoryName>')
    .description('获取某分类的记忆文档列表')
    .action(async (projectId, categoryName) => {
      try {
        // 先获取分类 ID
        const catResult = await apiGet(`/api/memories/${projectId}/categories`) as Record<string, unknown>
        const categories = catResult.data as Record<string, unknown>[]
        const cat = categories?.find(c => c.name === categoryName)
        if (!cat) {
          console.error(`❌ 分类 "${categoryName}" 不存在`)
          return
        }

        const docsResult = await apiGet(`/api/memories/${projectId}/documents?category_id=${cat.id}`) as Record<string, unknown>
        const docs = docsResult.data as Record<string, unknown>[]
        if (!docs || docs.length === 0) {
          console.log(`📭 分类 "${categoryName}" 下暂无文档`)
          return
        }
        console.log(`📄 分类 "${categoryName}" 的文档:\n`)
        for (const doc of docs) {
          console.log(`  📝 [${doc.id}] ${doc.title} (${doc.file_path})`)
        }
      } catch (err) {
        console.error('❌', (err as Error).message)
      }
    })

  // 推送记忆文件
  memory
    .command('push <projectId> <filePath>')
    .description('推送记忆文件到看板')
    .requiredOption('--category <name>', '目标分类名称')
    .option('--title <title>', '文档标题')
    .action(async (projectId, filePath, opts) => {
      try {
        const fullPath = path.resolve(filePath)
        if (!fs.existsSync(fullPath)) {
          console.error(`❌ 文件不存在: ${fullPath}`)
          return
        }
        const content = fs.readFileSync(fullPath, 'utf-8')
        const title = opts.title || path.basename(filePath, path.extname(filePath))
        const fileName = path.basename(filePath)

        // 获取分类 ID
        const catResult = await apiGet(`/api/memories/${projectId}/categories`) as Record<string, unknown>
        const categories = catResult.data as Record<string, unknown>[]
        let cat = categories?.find(c => c.name === opts.category)

        // 分类不存在则创建
        if (!cat) {
          console.log(`📁 创建新分类: ${opts.category}`)
          await apiPost(`/api/memories/${projectId}/categories`, { name: opts.category, description: '' })
          const newCats = await apiGet(`/api/memories/${projectId}/categories`) as Record<string, unknown>
          cat = (newCats.data as Record<string, unknown>[])?.find(c => c.name === opts.category)
        }

        if (!cat) {
          console.error('❌ 无法创建分类')
          return
        }

        const result = await apiPost(`/api/memories/${projectId}/documents`, {
          category_id: cat.id,
          title,
          file_name: fileName,
          content
        }) as Record<string, unknown>

        if (result.success) {
          console.log(`✅ 记忆文件已推送: ${title} (${result.action})`)
        } else {
          console.error(`❌ 推送失败: ${result.error}`)
        }
      } catch (err) {
        console.error('❌', (err as Error).message)
      }
    })

  // 同步本地记忆目录
  memory
    .command('sync <projectId>')
    .description('同步本地 .dashboard/memories/ 目录到看板')
    .action(async (projectId) => {
      try {
        const memDir = path.join(process.cwd(), '.dashboard', 'memories')
        if (!fs.existsSync(memDir)) {
          console.log('📭 本地记忆目录不存在，跳过同步')
          return
        }

        const files = fs.readdirSync(memDir).filter(f => f.endsWith('.md'))
        if (files.length === 0) {
          console.log('📭 本地记忆目录无 Markdown 文件')
          return
        }

        // 获取默认分类（使用第一个分类作为同步目标）
        const catResult = await apiGet(`/api/memories/${projectId}/categories`) as Record<string, unknown>
        const categories = catResult.data as Record<string, unknown>[]
        const defaultCatId = categories?.[0]?.id || 1

        const syncFiles = files.map(f => ({
          category_id: defaultCatId,
          title: path.basename(f, '.md'),
          file_name: f,
          content: fs.readFileSync(path.join(memDir, f), 'utf-8'),
          action: 'upsert'
        }))

        const result = await apiPost(`/api/memories/${projectId}/sync`, { files: syncFiles }) as Record<string, unknown>
        if (result.success) {
          console.log(`✅ 已同步 ${files.length} 个记忆文件`)
        } else {
          console.error(`❌ 同步失败`)
        }
      } catch (err) {
        console.error('❌', (err as Error).message)
      }
    })
}
