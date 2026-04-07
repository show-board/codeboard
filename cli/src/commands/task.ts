// ============================================================
// codeboard update / push 命令
// Agent 通过此命令向看板推送任务状态更新
// ============================================================

import { Command } from 'commander'
import { apiPost } from '../utils/api'

export function registerTaskCommand(program: Command) {
  // 完整形式：codeboard update
  program
    .command('update')
    .description('推送任务状态更新到看板')
    .requiredOption('--project-id <id>', '项目 ID')
    .requiredOption('--session-id <id>', 'Session ID')
    .requiredOption('--task-id <id>', '任务 ID')
    .requiredOption('--type <type>', '更新类型: session_start | task_start | task_progress | task_complete | session_complete')
    .option('--info <json>', '附加信息 JSON', '{}')
    .action(async (opts) => {
      try {
        let info: Record<string, unknown> = {}
        try {
          info = JSON.parse(opts.info)
        } catch {
          console.error('⚠️  --info 参数 JSON 解析失败，将忽略附加信息')
        }

        const body = {
          project_id: opts.projectId,
          session_id: opts.sessionId,
          task_id: opts.taskId,
          type: opts.type,
          ...info
        }

        const result = await apiPost('/api/tasks/update', body) as Record<string, unknown>
        if (result.success) {
          console.log(`✅ 任务更新已推送 [${opts.type}]`)
        } else {
          console.error(`❌ 推送失败: ${result.error}`)
        }
      } catch (err) {
        console.error('❌ 推送失败:', (err as Error).message)
      }
    })

  // 简写形式：codeboard push
  program
    .command('push <projectId> <sessionId> <taskId> <type> [infoJson]')
    .description('推送任务更新 (简写形式)')
    .action(async (projectId, sessionId, taskId, type, infoJson) => {
      try {
        let info: Record<string, unknown> = {}
        if (infoJson) {
          try {
            info = JSON.parse(infoJson)
          } catch {
            console.error('⚠️  info JSON 解析失败')
          }
        }

        const body = {
          project_id: projectId,
          session_id: sessionId,
          task_id: taskId,
          type,
          ...info
        }

        const result = await apiPost('/api/tasks/update', body) as Record<string, unknown>
        if (result.success) {
          console.log(`✅ [${type}] 已推送`)
        } else {
          console.error(`❌ ${result.error}`)
        }
      } catch (err) {
        console.error('❌', (err as Error).message)
      }
    })
}
