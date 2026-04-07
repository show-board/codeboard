// ============================================================
// 用户设置状态管理 (Zustand)
// 管理用户昵称、标语、服务器地址等持久化设置
// ============================================================

import { create } from 'zustand'

/** 显示配置项（可持久化） */
interface DisplayConfig {
  /** 卡片高度模式：'fixed' 固定高度带省略号，'full' 完整展示信息 */
  cardHeightMode: 'fixed' | 'full'
  /** 是否显示运行状态引导（闪烁 + 绿色环） */
  showRunningGuide: boolean
  /** 是否显示侧栏服务地址区域 */
  showServerConfig: boolean
  /** 是否显示侧栏 API 详情按钮 */
  showApiDetail: boolean
}

interface SettingsState {
  nickname: string
  motto: string
  host: string
  port: number
  avatar: string | null  // base64 data URL 或 null（使用默认头像）
  loaded: boolean
  /** 显示配置 */
  displayConfig: DisplayConfig

  loadSettings: () => Promise<void>
  updateNickname: (nickname: string) => Promise<void>
  updateMotto: (motto: string) => Promise<void>
  updateAvatar: (dataUrl: string) => Promise<void>
  restartServer: (host: string, port: number) => Promise<void>
  /** 更新显示配置（局部更新） */
  updateDisplayConfig: (partial: Partial<DisplayConfig>) => void
}

/** 默认显示配置 */
const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  cardHeightMode: 'full',
  showRunningGuide: true,
  showServerConfig: true,
  showApiDetail: true
}

/** 从 localStorage 读取显示配置 */
function loadDisplayConfig(): DisplayConfig {
  try {
    const raw = localStorage.getItem('codeboard_display_config')
    if (raw) return { ...DEFAULT_DISPLAY_CONFIG, ...JSON.parse(raw) }
  } catch { /* 忽略解析错误 */ }
  return { ...DEFAULT_DISPLAY_CONFIG }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  nickname: 'Coder',
  motto: 'Vibe Coding, Build the Future',
  host: '127.0.0.1',
  port: 2585,
  avatar: null,
  loaded: false,
  displayConfig: loadDisplayConfig(),

  /** 从数据库加载设置，同时加载本地头像 */
  loadSettings: async () => {
    try {
      const [settings, avatarData] = await Promise.all([
        window.codeboard.getSettings(),
        window.codeboard.getAvatar()
      ])
      set({
        nickname: settings.nickname || 'Coder',
        motto: settings.motto || 'Vibe Coding, Build the Future',
        host: settings.host || '127.0.0.1',
        port: parseInt(settings.port || '2585', 10),
        avatar: avatarData || null,
        loaded: true
      })
    } catch (err) {
      console.error('加载设置失败:', err)
      set({ loaded: true })
    }
  },

  /** 更新昵称 */
  updateNickname: async (nickname: string) => {
    await window.codeboard.updateSettings({ nickname })
    set({ nickname })
  },

  /** 更新标语 */
  updateMotto: async (motto: string) => {
    await window.codeboard.updateSettings({ motto })
    set({ motto })
  },

  /** 更新头像（裁剪后的 data URL） */
  updateAvatar: async (dataUrl: string) => {
    await window.codeboard.saveAvatar(dataUrl)
    set({ avatar: dataUrl })
  },

  /** 重启服务器（修改 host/port） */
  restartServer: async (host: string, port: number) => {
    try {
      await window.codeboard.restartServer(host, port)
      await window.codeboard.updateSettings({ host, port: String(port) })
      set({ host, port })
    } catch (err) {
      console.error('重启服务器失败:', err)
      throw err
    }
  },

  /** 更新显示配置并持久化到 localStorage */
  updateDisplayConfig: (partial: Partial<DisplayConfig>) => {
    const current = get().displayConfig
    const next = { ...current, ...partial }
    localStorage.setItem('codeboard_display_config', JSON.stringify(next))
    set({ displayConfig: next })
  }
}))
