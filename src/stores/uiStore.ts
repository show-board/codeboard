// ============================================================
// UI 状态管理 (Zustand)
// 管理弹窗显示、排序方式、时间过滤、当前选中项等 UI 状态
// ============================================================

import { create } from 'zustand'

type SortType = 'updated' | 'started' | 'name'
type SortOrder = 'asc' | 'desc'
type CardSortOrder = 'newest' | 'oldest'
type TimeFilter = 'all' | 'recent' | 'yesterday_today' | 'today'

interface UIState {
  // 排序和过滤
  sortType: SortType
  sortOrder: SortOrder
  cardSortOrder: CardSortOrder
  timeFilter: TimeFilter
  setSortType: (sort: SortType) => void
  setSortOrder: (order: SortOrder) => void
  setCardSortOrder: (order: CardSortOrder) => void
  setTimeFilter: (filter: TimeFilter) => void

  // 弹窗控制
  showAllProjects: boolean
  showTrashBin: boolean
  showApiDetail: boolean
  showProjectDetail: string | null
  showTaskDetail: string | null
  showMemoryManager: string | null
  showPromptInput: string | null
  showRecommendations: boolean
  showSkillsGenerator: boolean
  showHelpGuide: boolean
  showNotificationDetail: string | null
  showSettings: boolean

  setShowAllProjects: (show: boolean) => void
  setShowTrashBin: (show: boolean) => void
  setShowApiDetail: (show: boolean) => void
  setShowProjectDetail: (projectId: string | null) => void
  setShowTaskDetail: (sessionId: string | null) => void
  setShowMemoryManager: (projectId: string | null) => void
  setShowPromptInput: (sessionId: string | null) => void
  setShowRecommendations: (show: boolean) => void
  setShowSkillsGenerator: (show: boolean) => void
  setShowHelpGuide: (show: boolean) => void
  setShowNotificationDetail: (projectId: string | null) => void
  setShowSettings: (show: boolean) => void

  // 滚动目标（用于消息色块点击后自动滑动到对应项目列）
  scrollToProject: string | null
  setScrollToProject: (projectId: string | null) => void

  // 项目放大（全屏展开某个项目，左半卡片 + 右半记忆）
  expandedProject: string | null
  setExpandedProject: (projectId: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  sortType: 'updated',
  sortOrder: 'desc',
  cardSortOrder: 'newest',
  timeFilter: 'all',
  setSortType: (sort) => set({ sortType: sort }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setCardSortOrder: (order) => set({ cardSortOrder: order }),
  setTimeFilter: (filter) => set({ timeFilter: filter }),

  showAllProjects: false,
  showTrashBin: false,
  showApiDetail: false,
  showProjectDetail: null,
  showTaskDetail: null,
  showMemoryManager: null,
  showPromptInput: null,
  showRecommendations: true,
  showSkillsGenerator: false,
  showHelpGuide: false,
  showNotificationDetail: null,
  showSettings: false,

  setShowAllProjects: (show) => set({ showAllProjects: show }),
  setShowTrashBin: (show) => set({ showTrashBin: show }),
  setShowApiDetail: (show) => set({ showApiDetail: show }),
  setShowProjectDetail: (projectId) => set({ showProjectDetail: projectId }),
  setShowTaskDetail: (sessionId) => set({ showTaskDetail: sessionId }),
  setShowMemoryManager: (projectId) => set({ showMemoryManager: projectId }),
  setShowPromptInput: (sessionId) => set({ showPromptInput: sessionId }),
  setShowRecommendations: (show) => set({ showRecommendations: show }),
  setShowSkillsGenerator: (show) => set({ showSkillsGenerator: show }),
  setShowHelpGuide: (show) => set({ showHelpGuide: show }),
  setShowNotificationDetail: (projectId) => set({ showNotificationDetail: projectId }),
  setShowSettings: (show) => set({ showSettings: show }),

  scrollToProject: null,
  setScrollToProject: (projectId) => set({ scrollToProject: projectId }),

  expandedProject: null,
  setExpandedProject: (projectId) => set({ expandedProject: projectId })
}))
