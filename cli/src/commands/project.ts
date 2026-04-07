// ============================================================
// codeboard project 命令
// 项目注册、信息查看、列表、测试连接等
// ============================================================

import { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import { parse, stringify } from 'yaml'
import { apiPost, apiGet } from '../utils/api'

export function registerProjectCommand(program: Command) {
  const project = program.command('project').description('项目管理')

  // 注册当前目录的项目
  project
    .command('register')
    .description('注册当前目录为 CodeBoard 项目')
    .option('-n, --name <name>', '项目名称')
    .option('-d, --desc <description>', '项目描述')
    .action(async (opts) => {
      const cwd = process.cwd()
      const dashboardDir = path.join(cwd, '.dashboard')
      const yamlPath = path.join(dashboardDir, 'project.yaml')

      // 检查是否已有 .dashboard/project.yaml
      if (fs.existsSync(yamlPath)) {
        const existing = parse(fs.readFileSync(yamlPath, 'utf-8'))
        console.log(`📁 发现已有项目配置: ${existing.project_name} (${existing.project_id})`)

        // 发送测试请求
        try {
          const result = await apiPost(`/api/projects/${existing.project_id}/test`, {}) as Record<string, unknown>
          if (result.available) {
            console.log('✅ 项目已在看板中注册，连接测试通过')
          } else {
            console.log('⚠️  项目不可用，尝试重新注册...')
            await registerProject(existing.project_id, existing.project_name, existing.project_description || '')
          }
        } catch (err) {
          console.error('❌ 连接失败，请确保 CodeBoard 应用正在运行')
        }
        return
      }

      // 创建新项目配置
      const projectName = opts.name || path.basename(cwd)
      const projectDesc = opts.desc || ''
      const projectId = `proj_${Date.now()}`

      // 创建 .dashboard 目录
      if (!fs.existsSync(dashboardDir)) {
        fs.mkdirSync(dashboardDir, { recursive: true })
      }

      // 创建 project.yaml
      const yamlContent = {
        project_name: projectName,
        project_description: projectDesc,
        project_id: projectId,
        created_at: new Date().toISOString()
      }
      fs.writeFileSync(yamlPath, stringify(yamlContent))
      console.log(`📝 已创建 .dashboard/project.yaml`)

      // 创建本地记忆目录
      const memDir = path.join(dashboardDir, 'memories')
      if (!fs.existsSync(memDir)) {
        fs.mkdirSync(memDir, { recursive: true })
      }

      // 注册到看板
      await registerProject(projectId, projectName, projectDesc)
    })

  // 查看项目信息
  project
    .command('info <projectId>')
    .description('查看项目详细信息')
    .action(async (projectId) => {
      try {
        const result = await apiGet(`/api/projects/${projectId}`) as Record<string, unknown>
        if (result.success) {
          const p = result.data as Record<string, unknown>
          console.log('📋 项目信息:')
          console.log(`   名称: ${p.name}`)
          console.log(`   ID:   ${p.project_id}`)
          console.log(`   描述: ${p.description || '(无)'}`)
          console.log(`   颜色: ${p.color}`)
          console.log(`   状态: ${p.status}`)
          console.log(`   创建: ${p.created_at}`)
          console.log(`   更新: ${p.updated_at}`)
        }
      } catch (err) {
        console.error('❌ 查询失败:', (err as Error).message)
      }
    })

  // 列出所有项目
  project
    .command('list')
    .description('列出所有已注册项目')
    .action(async () => {
      try {
        const result = await apiGet('/api/projects') as Record<string, unknown>
        const projects = result.data as Record<string, unknown>[]
        if (!projects || projects.length === 0) {
          console.log('📭 暂无已注册项目')
          return
        }
        console.log(`📋 共 ${projects.length} 个项目:\n`)
        for (const p of projects) {
          const status = p.status === 'visible' ? '🟢' : p.status === 'hidden' ? '🟡' : '🔴'
          console.log(`  ${status} ${p.name} (${p.project_id})`)
        }
      } catch (err) {
        console.error('❌ 查询失败:', (err as Error).message)
      }
    })

  // 测试连接
  project
    .command('test <projectId>')
    .description('测试项目与看板的连接')
    .action(async (projectId) => {
      try {
        const result = await apiPost(`/api/projects/${projectId}/test`, {}) as Record<string, unknown>
        if (result.available) {
          console.log('✅ 连接测试通过，项目可用')
        } else {
          console.log('❌ 项目不存在或不可用')
        }
      } catch (err) {
        console.error('❌ 连接失败:', (err as Error).message)
      }
    })
}

/** 向看板 API 注册项目 */
async function registerProject(projectId: string, name: string, description: string) {
  try {
    const result = await apiPost('/api/projects/register', {
      project_id: projectId,
      name,
      description
    }) as Record<string, unknown>

    if (result.success) {
      console.log('✅ 项目已成功注册到 CodeBoard 看板')
      console.log(`   项目 ID: ${projectId}`)
      console.log(`   颜色: ${(result.data as Record<string, unknown>)?.color}`)
    } else {
      console.error(`❌ 注册失败: ${result.error}`)
      console.log('   请修改项目名称或 ID 后重试')
    }
  } catch (err) {
    console.error('❌ 注册失败，请确保 CodeBoard 应用正在运行:', (err as Error).message)
  }
}
