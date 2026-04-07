// ============================================================
// 任务推荐服务
// 每次打开看板时，基于项目活跃度和状态推荐需要关注的项目
// ============================================================

import * as db from '../db'

/** 推荐项目结果 */
export interface RecommendationItem {
  project_id: string
  project_name: string
  color: string
  reason: string
  priority: number
}

/** 生成推荐项目列表 */
export function generateRecommendations(): RecommendationItem[] {
  const recommendations: RecommendationItem[] = []
  const data = db.getRecommendations()

  // 优先级 1: 有正在运行的 Session
  const seenProjects = new Set<string>()
  for (const item of data.activeSessions as Record<string, unknown>[]) {
    const pid = item.project_id as string
    if (!seenProjects.has(pid)) {
      seenProjects.add(pid)
      recommendations.push({
        project_id: pid,
        project_name: item.name as string,
        color: item.color as string,
        reason: `有正在运行的任务: ${(item.goal as string)?.substring(0, 50) || '进行中'}`,
        priority: 1
      })
    }
  }

  // 优先级 2: 有已写提示词的期待卡片
  for (const item of data.withPrompts as Record<string, unknown>[]) {
    const pid = item.project_id as string
    if (!seenProjects.has(pid)) {
      seenProjects.add(pid)
      recommendations.push({
        project_id: pid,
        project_name: item.name as string,
        color: item.color as string,
        reason: `有待执行的提示词: ${(item.prompt_text as string)?.substring(0, 40)}...`,
        priority: 2
      })
    }
  }

  // 优先级 3: 近期活跃但超过 24h 未更新
  for (const item of data.staleProjects as Record<string, unknown>[]) {
    const pid = item.project_id as string
    if (!seenProjects.has(pid)) {
      seenProjects.add(pid)
      recommendations.push({
        project_id: pid,
        project_name: item.name as string,
        color: item.color as string,
        reason: '近期活跃但已超过 24 小时未更新，建议检查进度',
        priority: 3
      })
    }
  }

  // 按优先级排序
  return recommendations.sort((a, b) => a.priority - b.priority)
}
