// ============================================================
// 放大模式：右半区域 hooks 统计面板
// 展示当前选中 Session 的 hooks 触发统计与明细列表
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import { Activity, Gauge, Wrench, FilePenLine, Cpu, AlertTriangle, Filter, Clock3 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'

interface HookEvent {
  id: number
  agent_type: string
  hook_event_name: string
  event_category: string
  status: 'success' | 'error'
  summary: string
  payload: Record<string, unknown>
  created_at: string
}

interface HookStats {
  total_events: number
  mcp_count: number
  tool_call_count: number
  file_write_count: number
  file_read_count: number
  shell_count: number
  session_count: number
  subagent_count: number
  compact_count: number
  message_count: number
  prompt_count: number
  other_count: number
  error_count: number
  last_event_at: string | null
  category_counts: { event_category: string; count: number }[]
  hook_name_counts: { hook_event_name: string; count: number }[]
}

interface Props {
  projectId: string
  projectName: string
  sessionId: string | null
}

// hooks 分类元信息：统一定义标签、图标和排序，便于 UI 展示稳定且可扩展
const CATEGORY_META: Record<string, { label: string; icon: LucideIcon; order: number }> = {
  mcp: { label: 'MCP', icon: Cpu, order: 1 },
  tool_call: { label: 'ToolCall', icon: Wrench, order: 2 },
  file_write: { label: '文件写入', icon: FilePenLine, order: 3 },
  file_read: { label: '文件读取', icon: Activity, order: 4 },
  shell: { label: '命令执行', icon: Gauge, order: 5 },
  session: { label: '会话生命周期', icon: Clock3, order: 6 },
  subagent: { label: '子代理', icon: Activity, order: 7 },
  compact: { label: '上下文压缩', icon: Filter, order: 8 },
  message: { label: '消息事件', icon: Activity, order: 9 },
  prompt: { label: 'Prompt 提交', icon: Activity, order: 10 },
  other: { label: '其他', icon: Activity, order: 11 }
}

const KNOWN_CATEGORIES = Object.keys(CATEGORY_META)

type PanelFilter = 'all' | `category:${string}` | `hook:${string}`

export default function ExpandedHooksPanel({ projectId, projectName, sessionId }: Props) {
  const { host, port } = useSettingsStore()
  const baseUrl = `http://${host}:${port}`

  const [stats, setStats] = useState<HookStats | null>(null)
  const [events, setEvents] = useState<HookEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<PanelFilter>('all')

  useEffect(() => {
    // 切换 Session 时重置筛选，避免“无数据”误判
    setFilter('all')
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) {
      setStats(null)
      setEvents([])
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${baseUrl}/api/hooks/sessions/${sessionId}?limit=500`)
        const json = await res.json()
        if (json.success) {
          setStats((json.data?.stats || null) as HookStats | null)
          setEvents((json.data?.events || []) as HookEvent[])
        }
      } catch (error) {
        console.error('加载 hooks 统计失败:', error)
        setStats(null)
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [sessionId, baseUrl])

  // 将后端 category_counts 转为 Map，便于快速读取每个分类的数量
  const categoryCountMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of stats?.category_counts || []) {
      map.set(item.event_category, Number(item.count || 0))
    }
    return map
  }, [stats])

  // 已知分类 + 数据中的未知分类：全部展示，避免漏掉 hooks 传输信息
  const allCategories = useMemo(() => {
    const dynamicCategories = Array.from(categoryCountMap.keys()).filter(key => !KNOWN_CATEGORIES.includes(key))
    return [...KNOWN_CATEGORIES, ...dynamicCategories]
  }, [categoryCountMap])

  const sortedCategories = useMemo(() => {
    return [...allCategories].sort((a, b) => {
      const aOrder = CATEGORY_META[a]?.order ?? 999
      const bOrder = CATEGORY_META[b]?.order ?? 999
      if (aOrder !== bOrder) return aOrder - bOrder
      return a.localeCompare(b)
    })
  }, [allCategories])

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events
    if (filter.startsWith('category:')) {
      const category = filter.slice('category:'.length)
      return events.filter(event => event.event_category === category)
    }
    if (filter.startsWith('hook:')) {
      const hookName = filter.slice('hook:'.length)
      return events.filter(event => event.hook_event_name === hookName)
    }
    return events
  }, [events, filter])

  const overviewCards = useMemo(() => ([
    { key: 'all' as const, label: '全部事件', value: stats?.total_events || 0, icon: Activity },
    { key: 'error' as const, label: '错误事件', value: stats?.error_count || 0, icon: AlertTriangle },
    { key: 'shell' as const, label: '命令执行', value: Number(categoryCountMap.get('shell') || 0), icon: Gauge }
  ]), [stats, categoryCountMap])

  // 高频 Hook 名称统计，用于二级筛选
  const topHookNames = useMemo(() => {
    return (stats?.hook_name_counts || []).slice(0, 10)
  }, [stats])

  const formatTime = (time: string) => {
    const d = new Date(time)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
  }

  // 事件提示：在卡片中显示最关键的上下文，避免先打开 payload 才能定位问题
  const readPayloadHint = (payload: Record<string, unknown>) => {
    const toolInput = (payload.tool_input && typeof payload.tool_input === 'object')
      ? (payload.tool_input as Record<string, unknown>)
      : {}
    const command = String(payload.command || toolInput.command || '')
    if (command) return command

    const toolName = String(payload.tool_name || payload.toolName || '')
    if (toolName) return `tool=${toolName}`

    const filePath = String(payload.file_path || payload.filePath || '')
    if (filePath) return `file=${filePath}`

    const prompt = String(payload.prompt || '')
    if (prompt) {
      const attachments = Array.isArray(payload.attachments) ? payload.attachments.length : 0
      return `prompt长度=${prompt.length}${attachments > 0 ? ` | 附件=${attachments}` : ''}`
    }

    return ''
  }

  // 事件补充标签：覆盖更多 hooks 字段，支持更细粒度观测
  const buildEventTags = (payload: Record<string, unknown>) => {
    const tags: string[] = []
    const duration = payload.duration ?? payload.duration_ms
    if (typeof duration === 'number') tags.push(`duration=${duration}ms`)

    const failureType = String(payload.failure_type || '')
    if (failureType) tags.push(`failure=${failureType}`)

    const reason = String(payload.reason || '')
    if (reason) tags.push(`reason=${reason}`)

    const trigger = String(payload.trigger || '')
    if (trigger) tags.push(`trigger=${trigger}`)

    const contextUsagePercent = payload.context_usage_percent
    if (typeof contextUsagePercent === 'number') tags.push(`context=${contextUsagePercent}%`)

    const attachments = Array.isArray(payload.attachments) ? payload.attachments.length : 0
    if (attachments > 0) tags.push(`attachments=${attachments}`)

    return tags
  }

  const formatFilterLabel = (value: PanelFilter) => {
    if (value === 'all') return 'all'
    if (value.startsWith('category:')) {
      const key = value.slice('category:'.length)
      return `category:${CATEGORY_META[key]?.label || key}`
    }
    if (value.startsWith('hook:')) {
      return `hook:${value.slice('hook:'.length)}`
    }
    return value
  }

  return (
    <div className="h-full flex flex-col bg-white/30 dark:bg-neutral-800/30 backdrop-blur-sm">
      {/* 头部信息 */}
      <div className="px-5 py-3 border-b border-gray-200/50 dark:border-gray-700/50 shrink-0">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {projectName} — Session Hooks 统计
          </h3>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
          project: {projectId} {sessionId ? `| session: ${sessionId}` : '| 未选中 session'}
        </p>
      </div>

      {!sessionId ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-gray-400">点击左侧 Session 卡片后查看该会话的 hooks 记录</p>
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 概览卡：数量少、信息密，保证详情区空间 */}
          <div className="p-3 grid grid-cols-3 gap-2 shrink-0">
            {overviewCards.map(card => {
              const Icon = card.icon
              return (
                <div
                  key={card.key}
                  className="text-left rounded-xl px-3 py-2 border bg-white/70 dark:bg-neutral-700/60 border-gray-200/60 dark:border-gray-600/60"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">{card.label}</span>
                    <Icon className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 mt-1">{card.value}</p>
                </div>
              )
            })}
          </div>

          {/* 分类胶囊：覆盖所有可统计 hooks 分类，点击筛选 */}
          <div className="px-3 pb-2 shrink-0">
            <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/65 dark:bg-neutral-700/45 px-2 py-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">分类统计（可筛选）</p>
                <button
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300/70 dark:border-blue-700/70 text-blue-600 dark:text-blue-300'
                      : 'bg-white/70 dark:bg-neutral-700/50 border-gray-200/60 dark:border-gray-600/60 text-gray-500 dark:text-gray-300'
                  }`}
                  onClick={() => setFilter('all')}
                >
                  全部
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto column-scroll">
                {sortedCategories.map(category => {
                  const count = Number(categoryCountMap.get(category) || 0)
                  const Icon = CATEGORY_META[category]?.icon || Activity
                  const label = CATEGORY_META[category]?.label || category
                  const active = filter === `category:${category}`
                  return (
                    <button
                      key={category}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] border transition-colors ${
                        active
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300/70 dark:border-blue-700/70 text-blue-700 dark:text-blue-300'
                          : 'bg-white/75 dark:bg-neutral-700/55 border-gray-200/60 dark:border-gray-600/60 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-neutral-700'
                      }`}
                      onClick={() => setFilter(`category:${category}`)}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{label}</span>
                      <span className="text-[10px] opacity-75">{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 高频 Hook 标签：例如 beforeSubmitPrompt、afterShellExecution 等 */}
          <div className="px-3 pb-2 shrink-0">
            <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/65 dark:bg-neutral-700/45 px-2 py-2">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">高频 Hook（可筛选）</p>
              {topHookNames.length === 0 ? (
                <p className="text-[11px] text-gray-400">暂无 hooks 名称统计</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto column-scroll">
                  {topHookNames.map(item => {
                    const hookName = item.hook_event_name
                    const active = filter === `hook:${hookName}`
                    return (
                      <button
                        key={hookName}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] border transition-colors ${
                          active
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300/70 dark:border-indigo-700/70 text-indigo-700 dark:text-indigo-300'
                            : 'bg-white/75 dark:bg-neutral-700/55 border-gray-200/60 dark:border-gray-600/60 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-neutral-700'
                        }`}
                        onClick={() => setFilter(`hook:${hookName}`)}
                      >
                        <span className="truncate max-w-[220px]">{hookName}</span>
                        <span className="text-[10px] opacity-75">{item.count}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 辅助信息 */}
          <div className="px-3 pb-2 flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              error: {stats?.error_count || 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="w-3.5 h-3.5 text-gray-400" />
              last: {stats?.last_event_at ? formatTime(stats.last_event_at) : '暂无'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              filter: {formatFilterLabel(filter)}
            </span>
          </div>

          {/* 明细列表：保留最大可视区域，并提供可折叠 payload 详情 */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 column-scroll">
            {filteredEvents.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-gray-400">当前筛选下暂无 hooks 记录</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map(event => {
                  const hint = readPayloadHint(event.payload || {})
                  const tags = buildEventTags(event.payload || {})
                  return (
                    <div
                      key={event.id}
                      className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/70 dark:bg-neutral-700/50 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300">
                            {event.agent_type || 'unknown'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                            {event.event_category}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            event.status === 'error'
                              ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
                              : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
                          }`}>
                            {event.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{formatTime(event.created_at)}</span>
                      </div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-200 mt-2 break-all">
                        {event.hook_event_name}
                      </p>
                      {event.summary && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 break-all">
                          {event.summary}
                        </p>
                      )}
                      {hint && (
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 break-all">
                          {hint}
                        </p>
                      )}
                      {tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tags.map(tag => (
                            <span
                              key={`${event.id}-${tag}`}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[10px] text-gray-500 dark:text-gray-400 select-none">
                          查看 payload JSON
                        </summary>
                        <pre className="mt-1 text-[10px] leading-4 whitespace-pre-wrap break-all rounded-lg bg-gray-100/80 dark:bg-neutral-800/80 p-2 text-gray-700 dark:text-gray-200">
                          {JSON.stringify(event.payload || {}, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

