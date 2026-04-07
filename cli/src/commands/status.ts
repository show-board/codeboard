// ============================================================
// codeboard status 命令
// 查看 CodeBoard 服务状态和项目状态
// ============================================================

import { Command } from 'commander'
import { apiGet, getBaseUrl } from '../utils/api'

export function registerStatusCommand(program: Command) {
  program
    .command('status [projectId]')
    .description('查看 CodeBoard 服务状态，可选指定项目')
    .action(async (projectId?: string) => {
      const baseUrl = getBaseUrl()
      console.log(`🔍 检查 CodeBoard 服务: ${baseUrl}\n`)

      // 检查服务健康状态
      try {
        const health = await apiGet('/api/health') as Record<string, unknown>
        console.log(`✅ 服务状态: ${health.message}`)
      } catch {
        console.error('❌ 服务不可达，请确保 CodeBoard 应用正在运行')
        return
      }

      if (projectId) {
        // 查看指定项目状态
        try {
          const result = await apiGet(`/api/projects/${projectId}`) as Record<string, unknown>
          if (result.success) {
            const p = result.data as Record<string, unknown>
            console.log(`\n📋 项目: ${p.name}`)
            console.log(`   状态: ${p.status}`)
            console.log(`   更新: ${p.updated_at}`)
          }

          const sessions = await apiGet(`/api/sessions/${projectId}`) as Record<string, unknown>
          const data = sessions.data as Record<string, unknown>[]
          if (data && data.length > 0) {
            console.log(`\n📊 Session 记录 (最近 5 条):`)
            for (const s of data.slice(0, 5)) {
              const icon = s.status === 'completed' ? '✅' : s.status === 'running' ? '⚡' : '⏳'
              console.log(`   ${icon} [${s.session_id}] ${s.goal || '(无目标)'} - ${s.status}`)
            }
          }
        } catch (err) {
          console.error('❌', (err as Error).message)
        }
      } else {
        // 查看所有项目概况
        try {
          const result = await apiGet('/api/projects') as Record<string, unknown>
          const projects = result.data as Record<string, unknown>[]
          console.log(`\n📋 已注册项目: ${projects?.length || 0} 个`)
          if (projects) {
            for (const p of projects) {
              const icon = p.status === 'visible' ? '🟢' : p.status === 'hidden' ? '🟡' : '🔴'
              console.log(`   ${icon} ${p.name} (${p.project_id}) - ${p.status}`)
            }
          }
        } catch (err) {
          console.error('❌', (err as Error).message)
        }
      }
    })
}
