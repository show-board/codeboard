// ============================================================
// 放大模式：右半区域 hooks 统计面板
// 双模式：① 分类统计（概览+分类胶囊+卡片明细）② 时间线（日期分组+竖线节点+筛选动画）
// 筛选在两种模式下共享，切换时带线性动画缩减
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Gauge, Wrench, FilePenLine, Cpu, AlertTriangle,
  Filter, Clock3, BarChart3, GitCommitHorizontal, ChevronDown, Bell, Zap
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'

// ---- 类型定义 ----

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

interface HookSessionCount {
  session_id: string
  count: number
  last_event_at: string
}

interface Props {
  projectId: string
  projectName: string
  sessionId: string | null
  onSwitchSession?: (sessionId: string) => void
  /** 当前 session 映射的 Cursor conversation_id */
  cursorConversationId?: string | null
  /** 当前 session 映射的 Cursor generation_id（精确到轮次） */
  cursorGenerationId?: string | null
}

// ---- 分类元信息 ----

const CATEGORY_META: Record<string, { label: string; icon: LucideIcon; order: number; color: string }> = {
  mcp:        { label: 'MCP',        icon: Cpu,          order: 1,  color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' },
  tool_call:  { label: 'ToolCall',   icon: Wrench,       order: 2,  color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' },
  file_write: { label: '文件写入',    icon: FilePenLine,  order: 3,  color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' },
  file_read:  { label: '文件读取',    icon: Activity,     order: 4,  color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20' },
  shell:      { label: '命令执行',    icon: Gauge,        order: 5,  color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
  session:    { label: '会话',       icon: Clock3,       order: 6,  color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
  subagent:   { label: '子代理',     icon: Zap,          order: 7,  color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' },
  compact:    { label: '压缩',       icon: Filter,       order: 8,  color: 'text-teal-500 bg-teal-50 dark:bg-teal-900/20' },
  message:    { label: '消息',       icon: Bell,         order: 9,  color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20' },
  prompt:     { label: 'Prompt',     icon: GitCommitHorizontal, order: 10, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
  other:      { label: '其他',       icon: Activity,     order: 11, color: 'text-gray-500 bg-gray-100 dark:bg-gray-800' }
}

const KNOWN_CATEGORIES = Object.keys(CATEGORY_META)

type PanelFilter = 'all' | `category:${string}` | `hook:${string}`
type ViewMode = 'stats' | 'timeline'

// ---- 通知类 hook 名称集合：在时间线中以缩小化样式显示 ----
const NOTIFICATION_HOOKS = new Set([
  'beforeReadFile', 'beforeTabFileRead', 'preToolUse', 'afterAgentThought'
])

// ---- 辅助函数 ----

function formatTime(time: string) {
  const d = new Date(time)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

function formatFullTime(time: string) {
  const d = new Date(time)
  return `${d.getMonth() + 1}/${d.getDate()} ${formatTime(time)}`
}

function dateKey(time: string) {
  const d = new Date(time)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

function readPayloadHint(payload: Record<string, unknown>) {
  const toolInput = (payload.tool_input && typeof payload.tool_input === 'object')
    ? (payload.tool_input as Record<string, unknown>) : {}
  const command = String(payload.command || toolInput.command || '')
  if (command) return command.length > 120 ? command.slice(0, 120) + '…' : command
  const toolName = String(payload.tool_name || payload.toolName || '')
  if (toolName) return `tool=${toolName}`
  const filePath = String(payload.file_path || payload.filePath || '')
  if (filePath) return filePath
  return ''
}

function buildEventTags(payload: Record<string, unknown>) {
  const tags: string[] = []
  const duration = payload.duration ?? payload.duration_ms
  if (typeof duration === 'number') tags.push(`${duration}ms`)
  const failureType = String(payload.failure_type || '')
  if (failureType) tags.push(`fail:${failureType}`)
  const reason = String(payload.reason || '')
  if (reason) tags.push(reason)
  return tags
}

// ---- 主组件 ----

export default function ExpandedHooksPanel({ projectId, projectName, sessionId, onSwitchSession, cursorConversationId, cursorGenerationId }: Props) {
  const { host, port } = useSettingsStore()
  const baseUrl = `http://${host}:${port}`

  const [stats, setStats] = useState<HookStats | null>(null)
  const [events, setEvents] = useState<HookEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<PanelFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [hookSessionCounts, setHookSessionCounts] = useState<HookSessionCount[]>([])
  // 筛选面板是否展开（时间线模式下默认收起，保持紧凑）
  const [filterExpanded, setFilterExpanded] = useState(false)
  // 时间线中展开了 payload 的事件 ID
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 切换 session 时重置
  useEffect(() => {
    setFilter('all')
    setFilterExpanded(false)
    setExpandedEventId(null)
  }, [sessionId])

  // 数据加载 + 5 秒轮询
  useEffect(() => {
    if (!sessionId) { setStats(null); setEvents([]); return }
    let cancelled = false
    const load = async (initial = false) => {
      if (initial) setLoading(true)
      try {
        const res = await fetch(`${baseUrl}/api/hooks/sessions/${sessionId}?limit=500`)
        const json = await res.json()
        if (!cancelled && json.success) {
          setStats((json.data?.stats || null) as HookStats | null)
          setEvents((json.data?.events || []) as HookEvent[])
        }
      } catch (e) {
        if (!cancelled && initial) { setStats(null); setEvents([]) }
        if (!cancelled) console.error('hooks 加载失败:', e)
      } finally {
        if (!cancelled && initial) setLoading(false)
      }
    }
    void load(true)
    const timer = setInterval(() => void load(false), 5000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [sessionId, baseUrl])

  // 无事件时获取项目级 hooks session 计数
  useEffect(() => {
    if (!projectId || !sessionId) return
    if (stats === null || (stats.total_events ?? 0) > 0) { setHookSessionCounts([]); return }
    let cancelled = false
    fetch(`${baseUrl}/api/hooks/project/${projectId}/session-counts`)
      .then(r => r.json())
      .then(json => { if (!cancelled && json.success) setHookSessionCounts((json.data || []) as HookSessionCount[]) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [projectId, sessionId, stats, baseUrl])

  // ---- 派生数据 ----

  const categoryCountMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of stats?.category_counts || []) map.set(item.event_category, Number(item.count || 0))
    return map
  }, [stats])

  const sortedCategories = useMemo(() => {
    const dynamic = Array.from(categoryCountMap.keys()).filter(k => !KNOWN_CATEGORIES.includes(k))
    return [...KNOWN_CATEGORIES, ...dynamic].sort((a, b) => (CATEGORY_META[a]?.order ?? 999) - (CATEGORY_META[b]?.order ?? 999))
  }, [categoryCountMap])

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events
    if (filter.startsWith('category:')) return events.filter(e => e.event_category === filter.slice('category:'.length))
    if (filter.startsWith('hook:')) return events.filter(e => e.hook_event_name === filter.slice('hook:'.length))
    return events
  }, [events, filter])

  // 按日期分组（时间线用，事件倒序 → 先展示最新日期）
  const groupedByDate = useMemo(() => {
    const groups: { date: string; events: HookEvent[] }[] = []
    for (const event of filteredEvents) {
      const dk = dateKey(event.created_at)
      const last = groups[groups.length - 1]
      if (last && last.date === dk) last.events.push(event)
      else groups.push({ date: dk, events: [event] })
    }
    return groups
  }, [filteredEvents])

  const topHookNames = useMemo(() => (stats?.hook_name_counts || []).slice(0, 8), [stats])

  // ---- 筛选栏渲染（两种模式共享，紧凑可折叠） ----

  const filterLabel = filter === 'all' ? '全部'
    : filter.startsWith('category:') ? (CATEGORY_META[filter.slice('category:'.length)]?.label || filter.slice('category:'.length))
    : filter.slice('hook:'.length)

  const renderCompactFilter = () => (
    <div className="px-3 pt-2 pb-1 shrink-0">
      {/* 紧凑筛选条：当前筛选 + 展开/收起 */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setFilterExpanded(v => !v)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border border-gray-200/60 dark:border-gray-700/60 bg-white/70 dark:bg-neutral-700/50 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-neutral-600/50 transition-colors"
        >
          <Filter className="w-3 h-3" />
          <span>筛选: {filterLabel}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${filterExpanded ? 'rotate-180' : ''}`} />
        </button>

        {/* 快速清除筛选 */}
        {filter !== 'all' && (
          <button
            onClick={() => setFilter('all')}
            className="px-1.5 py-1 rounded text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            清除
          </button>
        )}

        {/* 右侧统计摘要 */}
        <div className="ml-auto flex items-center gap-2 text-[10px] text-gray-400">
          <span>{stats?.total_events || 0} 事件</span>
          {(stats?.error_count || 0) > 0 && (
            <span className="text-red-400 flex items-center gap-0.5">
              <AlertTriangle className="w-3 h-3" />{stats?.error_count}
            </span>
          )}
          <span>{filteredEvents.length} 显示</span>
        </div>
      </div>

      {/* 展开的筛选面板 */}
      <AnimatePresence>
        {filterExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-1.5">
              {/* 分类筛选胶囊 */}
              <div className="flex flex-wrap gap-1">
                {sortedCategories.map(cat => {
                  const count = Number(categoryCountMap.get(cat) || 0)
                  if (count === 0) return null
                  const meta = CATEGORY_META[cat]
                  const Icon = meta?.icon || Activity
                  const active = filter === `category:${cat}`
                  return (
                    <button
                      key={cat}
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] border transition-colors ${
                        active
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300/70 dark:border-blue-700/70 text-blue-700 dark:text-blue-300'
                          : 'bg-white/75 dark:bg-neutral-700/55 border-gray-200/50 dark:border-gray-600/50 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                      onClick={() => setFilter(active ? 'all' : `category:${cat}`)}
                    >
                      <Icon className="w-2.5 h-2.5" />
                      <span>{meta?.label || cat}</span>
                      <span className="opacity-60">{count}</span>
                    </button>
                  )
                })}
              </div>
              {/* 高频 hook 名称 */}
              {topHookNames.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {topHookNames.map(item => {
                    const active = filter === `hook:${item.hook_event_name}`
                    return (
                      <button
                        key={item.hook_event_name}
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] border transition-colors ${
                          active
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300/70 dark:border-indigo-700/70 text-indigo-700 dark:text-indigo-300'
                            : 'bg-white/75 dark:bg-neutral-700/55 border-gray-200/50 dark:border-gray-600/50 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                        onClick={() => setFilter(active ? 'all' : `hook:${item.hook_event_name}`)}
                      >
                        <span className="truncate max-w-[140px]">{item.hook_event_name}</span>
                        <span className="opacity-60">{item.count}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  // ---- 分类统计视图 ----

  const renderStatsView = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 概览三卡 */}
      <div className="p-3 grid grid-cols-3 gap-2 shrink-0">
        {[
          { label: '全部事件', value: stats?.total_events || 0, icon: Activity },
          { label: '错误事件', value: stats?.error_count || 0, icon: AlertTriangle },
          { label: '命令执行', value: Number(categoryCountMap.get('shell') || 0), icon: Gauge }
        ].map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="rounded-xl px-3 py-2 border bg-white/70 dark:bg-neutral-700/60 border-gray-200/60 dark:border-gray-600/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500 dark:text-gray-400">{card.label}</span>
                <Icon className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 mt-1">{card.value}</p>
            </div>
          )
        })}
      </div>

      {/* 分类统计横向条 */}
      <div className="px-3 pb-2 shrink-0">
        <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/65 dark:bg-neutral-700/45 p-2 space-y-1.5">
          {sortedCategories.map(cat => {
            const count = Number(categoryCountMap.get(cat) || 0)
            if (count === 0) return null
            const meta = CATEGORY_META[cat]
            const Icon = meta?.icon || Activity
            const pct = stats?.total_events ? Math.round(count / stats.total_events * 100) : 0
            return (
              <div key={cat} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${meta?.color || 'text-gray-500 bg-gray-100'}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <span className="text-[10px] text-gray-600 dark:text-gray-300 w-14 shrink-0 truncate">{meta?.label || cat}</span>
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-blue-400 dark:bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 w-10 text-right shrink-0">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {renderCompactFilter()}

      {/* 卡片明细列表 */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 column-scroll">
        {renderEventList()}
      </div>
    </div>
  )

  // ---- 时间线视图 ----

  const renderTimelineView = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {renderCompactFilter()}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 pb-3 column-scroll">
        {filteredEvents.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="space-y-4 pt-1">
            {groupedByDate.map(group => (
              <div key={group.date}>
                {/* 日期分割线 */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  <span className="text-[10px] font-medium text-gray-400 shrink-0">{group.date}</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                </div>

                {/* 时间线区域 */}
                <div className="relative ml-1">
                  {/* 竖线 */}
                  <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-200/80 dark:bg-gray-700/80" />

                  <AnimatePresence initial={false}>
                    {group.events.map(event => {
                      const meta = CATEGORY_META[event.event_category] || CATEGORY_META.other
                      const Icon = meta.icon
                      const isMinimized = NOTIFICATION_HOOKS.has(event.hook_event_name)
                      const isExpanded = expandedEventId === event.id
                      const hint = readPayloadHint(event.payload || {})
                      const tags = buildEventTags(event.payload || {})
                      const isError = event.status === 'error'

                      // 通知类 hooks：缩小化显示（单行不突出）
                      if (isMinimized && !isExpanded) {
                        return (
                          <motion.div
                            key={event.id}
                            layout
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-2 py-0.5 relative cursor-pointer group"
                            onClick={() => setExpandedEventId(event.id)}
                          >
                            {/* 小圆点节点 */}
                            <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 z-10 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                              <Icon className="w-2 h-2 text-gray-400" />
                            </div>
                            <span className="text-[9px] text-gray-400 font-mono shrink-0">{formatTime(event.created_at)}</span>
                            <span className="text-[9px] text-gray-400 truncate flex-1">{event.summary || event.hook_event_name}</span>
                            <span className="text-[9px] text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">展开</span>
                          </motion.div>
                        )
                      }

                      // 常规事件 / 展开的通知事件：完整卡片
                      return (
                        <motion.div
                          key={event.id}
                          layout
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="flex gap-2 relative py-1"
                        >
                          {/* 时间线节点 */}
                          <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 z-10 mt-1 ${meta.color}`}>
                            <Icon className="w-2.5 h-2.5" />
                          </div>

                          {/* 内容卡片 */}
                          <div
                            className={`flex-1 min-w-0 rounded-lg p-2 cursor-pointer transition-colors ${
                              isError
                                ? 'bg-red-50/60 dark:bg-red-900/15 border border-red-200/40 dark:border-red-800/40'
                                : 'bg-gray-50/60 dark:bg-neutral-800/40 hover:bg-gray-100/60 dark:hover:bg-neutral-700/40'
                            }`}
                            onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                          >
                            {/* 第一行：hook 名称 + 时间 */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`text-[10px] px-1 py-0.5 rounded font-medium ${
                                  isError ? 'text-red-600 dark:text-red-300' : 'text-gray-700 dark:text-gray-200'
                                }`}>
                                  {event.hook_event_name}
                                </span>
                                {isError && (
                                  <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                                )}
                              </div>
                              <span className="text-[9px] text-gray-400 font-mono shrink-0">{formatTime(event.created_at)}</span>
                            </div>

                            {/* 第二行：summary 描述 */}
                            {event.summary && (
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed break-all line-clamp-2">
                                {event.summary}
                              </p>
                            )}

                            {/* 第三行：hint 关键上下文 */}
                            {hint && (
                              <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-0.5 truncate font-mono">
                                {hint}
                              </p>
                            )}

                            {/* 标签 */}
                            {tags.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {tags.map(tag => (
                                  <span key={`${event.id}-${tag}`} className="text-[9px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* 展开的 payload */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-[9px]">
                                    <span className="px-1 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300">
                                      {event.agent_type}
                                    </span>
                                    <span className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                                      {event.event_category}
                                    </span>
                                    <span className={`px-1 py-0.5 rounded ${
                                      isError ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
                                              : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
                                    }`}>
                                      {event.status}
                                    </span>
                                  </div>
                                  <pre className="mt-1.5 text-[9px] leading-3.5 whitespace-pre-wrap break-all rounded-md bg-gray-100/80 dark:bg-neutral-900/60 p-2 text-gray-600 dark:text-gray-300 max-h-48 overflow-y-auto">
                                    {JSON.stringify(event.payload || {}, null, 2)}
                                  </pre>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // ---- 空状态 + session 切换建议 ----

  const renderEmptyState = () => (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-4">
      <p className="text-xs text-gray-400">当前筛选下暂无 hooks 记录</p>
      {hookSessionCounts.length > 0 && onSwitchSession && (
        <div className="w-full max-w-sm rounded-xl border border-purple-200/60 dark:border-purple-700/50 bg-purple-50/50 dark:bg-purple-900/20 p-3">
          <p className="text-[11px] text-purple-700 dark:text-purple-300 font-medium mb-2">
            以下 session 有 hooks 事件，点击切换：
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {hookSessionCounts.slice(0, 5).map(item => (
              <button
                key={item.session_id}
                className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] bg-white/80 dark:bg-neutral-700/60 border border-gray-200/50 dark:border-gray-600/50 hover:bg-purple-100 dark:hover:bg-purple-800/30 transition-colors"
                onClick={() => onSwitchSession(item.session_id)}
              >
                <span className="text-gray-700 dark:text-gray-200 font-mono truncate block">{item.session_id}</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {item.count} 条事件 · 最近 {formatFullTime(item.last_event_at)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ---- 卡片明细（分类统计模式用） ----

  const renderEventList = () => {
    if (filteredEvents.length === 0) return renderEmptyState()
    return (
      <div className="space-y-2">
        {filteredEvents.map(event => {
          const hint = readPayloadHint(event.payload || {})
          const tags = buildEventTags(event.payload || {})
          return (
            <div key={event.id} className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/70 dark:bg-neutral-700/50 p-3">
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
                <span className="text-[10px] text-gray-400 shrink-0">{formatFullTime(event.created_at)}</span>
              </div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200 mt-2 break-all">{event.hook_event_name}</p>
              {event.summary && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 break-all">{event.summary}</p>}
              {hint && <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 break-all">{hint}</p>}
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tags.map(tag => (
                    <span key={`${event.id}-${tag}`} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{tag}</span>
                  ))}
                </div>
              )}
              <details className="mt-2">
                <summary className="cursor-pointer text-[10px] text-gray-500 dark:text-gray-400 select-none">payload</summary>
                <pre className="mt-1 text-[10px] leading-4 whitespace-pre-wrap break-all rounded-lg bg-gray-100/80 dark:bg-neutral-800/80 p-2 text-gray-700 dark:text-gray-200">
                  {JSON.stringify(event.payload || {}, null, 2)}
                </pre>
              </details>
            </div>
          )
        })}
      </div>
    )
  }

  // ---- 渲染 ----

  return (
    <div className="h-full flex flex-col bg-white/30 dark:bg-neutral-800/30 backdrop-blur-sm">
      {/* 头部：标题 + 模式切换 */}
      <div className="px-4 py-2.5 border-b border-gray-200/50 dark:border-gray-700/50 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Gauge className="w-4 h-4 text-blue-500 shrink-0" />
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {projectName} — Hooks
            </h3>
          </div>
          {/* 模式切换按钮 */}
          <div className="flex items-center rounded-lg border border-gray-200/60 dark:border-gray-700/60 bg-white/60 dark:bg-neutral-700/40 p-0.5 shrink-0">
            <button
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              onClick={() => setViewMode('timeline')}
            >
              <GitCommitHorizontal className="w-3 h-3" />
              <span>时间线</span>
            </button>
            <button
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors ${
                viewMode === 'stats'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              onClick={() => setViewMode('stats')}
            >
              <BarChart3 className="w-3 h-3" />
              <span>统计</span>
            </button>
          </div>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          {sessionId ? `session: ${sessionId}` : '未选中 session'}
        </p>
        {(cursorConversationId || cursorGenerationId) && (
          <p className="text-[9px] text-purple-400 dark:text-purple-500 mt-0.5 truncate flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" />
            {cursorGenerationId
              ? `轮次: ${cursorGenerationId.slice(0, 8)}... (对话 ${cursorConversationId?.slice(0, 8) || '?'}...)`
              : `对话: ${cursorConversationId?.slice(0, 8)}...`}
          </p>
        )}
      </div>

      {/* 内容区 */}
      {!sessionId ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-gray-400">点击左侧 Session 卡片查看 hooks 记录</p>
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        viewMode === 'timeline' ? renderTimelineView() : renderStatsView()
      )}
    </div>
  )
}
