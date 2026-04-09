// ============================================================
// 放大模式：右半区域 hooks 统计面板
// 展示当前选中 Session 的 hooks 触发统计与明细列表
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import { Activity, Gauge, Wrench, FilePenLine, Cpu, AlertTriangle, Filter, Clock3 } from 'lucide-react'
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
  shell_count: number
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

type MetricFilter = 'all' | 'mcp' | 'tool_call' | 'file_write'

export default function ExpandedHooksPanel({ projectId, projectName, sessionId }: Props) {
  const { host, port } = useSettingsStore()
  const baseUrl = `http://${host}:${port}`

  const [stats, setStats] = useState<HookStats | null>(null)
  const [events, setEvents] = useState<HookEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<MetricFilter>('all')

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

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events
    return events.filter(event => event.event_category === filter)
  }, [events, filter])

  const metricCards = useMemo(() => ([
    { key: 'all' as const, label: '全部事件', value: stats?.total_events || 0, icon: Activity },
    { key: 'mcp' as const, label: 'MCP', value: stats?.mcp_count || 0, icon: Cpu },
    { key: 'tool_call' as const, label: 'ToolCall', value: stats?.tool_call_count || 0, icon: Wrench },
    { key: 'file_write' as const, label: '文件写入', value: stats?.file_write_count || 0, icon: FilePenLine }
  ]), [stats])

  const formatTime = (time: string) => {
    const d = new Date(time)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
  }

  const readPayloadHint = (payload: Record<string, unknown>) => {
    const command = String(payload.command || '')
    if (command) return command

    const toolName = String(payload.tool_name || payload.toolName || '')
    if (toolName) return `tool=${toolName}`

    const filePath = String(payload.file_path || payload.filePath || '')
    if (filePath) return `file=${filePath}`

    return ''
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
          {/* 统计卡片（点击可筛选） */}
          <div className="p-3 grid grid-cols-2 gap-2 shrink-0">
            {metricCards.map(card => {
              const Icon = card.icon
              const active = filter === card.key
              return (
                <button
                  key={card.key}
                  className={`text-left rounded-xl px-3 py-2 border transition-colors ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300/70 dark:border-blue-700/70'
                      : 'bg-white/70 dark:bg-neutral-700/60 border-gray-200/60 dark:border-gray-600/60 hover:bg-white dark:hover:bg-neutral-700'
                  }`}
                  onClick={() => setFilter(card.key)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">{card.label}</span>
                    <Icon className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 mt-1">{card.value}</p>
                </button>
              )
            })}
          </div>

          {/* 辅助指标 */}
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
              filter: {filter}
            </span>
          </div>

          {/* 明细列表 */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 column-scroll">
            {filteredEvents.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-gray-400">当前筛选下暂无 hooks 记录</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map(event => {
                  const hint = readPayloadHint(event.payload || {})
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

