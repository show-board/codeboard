// ============================================================
// Electron 主进程入口
// 负责窗口管理、托盘图标、系统通知、API 子进程管理、后台运行
// API 服务器运行在独立子进程中（使用系统 Node.js，避免 ABI 冲突）
// ============================================================

import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, Notification, shell, dialog } from 'electron'
import { spawn, ChildProcess, execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let serverProcess: ChildProcess | null = null
let currentHost = '127.0.0.1'
let currentPort = 2585

// API 服务的基础 URL
function apiUrl() { return `http://${currentHost}:${currentPort}` }

// ---- 通过 HTTP 调用 API（替代直接数据库访问）----

async function apiGet(path: string) {
  const res = await fetch(`${apiUrl()}${path}`)
  return res.json()
}
async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${apiUrl()}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  })
  return res.json()
}
async function apiPut(path: string, body: unknown) {
  const res = await fetch(`${apiUrl()}${path}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  })
  return res.json()
}
async function apiPatch(path: string, body: unknown) {
  const res = await fetch(`${apiUrl()}${path}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  })
  return res.json()
}
async function apiDelete(path: string) {
  const res = await fetch(`${apiUrl()}${path}`, { method: 'DELETE' })
  return res.json()
}

/**
 * 启动 API 服务器子进程
 * 仅在子进程 stdout 出现「API 服务已启动」时视为成功，避免端口被其他进程占用时
 * 仍因 5s 超时 + health 打到旧进程而误报「启动成功」
 */
function startServerProcess(host: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // 停止已有进程
    if (serverProcess) {
      serverProcess.kill()
      serverProcess = null
    }

    const dataDir = path.join(app.getPath('userData'), 'data')
    const serverScript = path.join(__dirname, 'server', 'standalone.js')

    // 查找系统 Node.js 路径（而非 Electron 内置 Node，避免 ABI 不兼容）
    let nodePath = 'node'
    try {
      nodePath = execSync('which node', { encoding: 'utf-8' }).trim()
    } catch {
      // 回退到 PATH 中的 node
    }

    let ready = false
    const START_TIMEOUT_MS = 15000
    let timeoutId: ReturnType<typeof setTimeout>

    const markReady = () => {
      if (ready) return
      ready = true
      clearTimeout(timeoutId)
      resolve()
    }

    const markFail = (err: Error) => {
      if (ready) return
      ready = true
      clearTimeout(timeoutId)
      if (serverProcess) {
        serverProcess.kill()
        serverProcess = null
      }
      reject(err)
    }

    timeoutId = setTimeout(() => {
      console.error('[Main]', `API 服务器启动超时（${START_TIMEOUT_MS}ms），端口 ${port}`)
      markFail(new Error(`API 服务器启动超时（${START_TIMEOUT_MS}ms），端口 ${port}`))
    }, START_TIMEOUT_MS)

    // 使用 spawn 以系统 Node.js 运行 API 服务器
    serverProcess = spawn(nodePath, [serverScript], {
      env: {
        ...process.env,
        CB_HOST: host,
        CB_PORT: String(port),
        CB_DATA_DIR: dataDir
      },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    serverProcess.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split(/\r?\n/)
      for (const line of lines) {
        const msg = line.trim()
        if (!msg) continue
        console.log(`[Server] ${msg}`)
        // 仅当本子进程真正 listen 成功时才就绪（与 standalone 日志一致）
        if (msg.includes('API 服务已启动')) {
          markReady()
        }
        // 解析 NOTIFY 消息，转发给渲染进程
        if (msg.includes('[NOTIFY]')) {
          try {
            const jsonStr = msg.replace(/.*\[NOTIFY\]\s*/, '')
            const notification = JSON.parse(jsonStr)
            if (notification.type === 'task-update' && mainWindow && !mainWindow.isDestroyed()) {
              sendNotification(notification.data as Record<string, string>)
              mainWindow.webContents.send('task-update', notification.data)
              mainWindow.webContents.send('notification', notification.data)
            } else if (notification.type === 'project-update' && mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('project-update', notification.data)
            }
          } catch { /* 忽略单行解析错误 */ }
        }
      }
    })

    serverProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      console.error(`[Server Error] ${text.trim()}`)
      // standalone 在 EADDRINUSE 时会打印 [CodeBoard-ERR] EADDRINUSE
      if (text.includes('EADDRINUSE') || text.includes('address already in use')) {
        markFail(new Error(`端口 ${port} 已被占用`))
      }
    })

    serverProcess.on('error', (err) => {
      console.error('[Main] 服务器进程错误:', err)
      markFail(err)
    })

    serverProcess.on('exit', (code, signal) => {
      console.log(`[Main] 服务器进程退出，代码: ${code}，signal: ${signal ?? 'none'}`)
      if (!ready) {
        markFail(new Error(`服务器进程在就绪前退出（代码 ${code}）`))
      }
      serverProcess = null
    })
  })
}

/** 发送 macOS 系统通知 */
function sendNotification(data: Record<string, string>) {
  if (!Notification.isSupported()) return
  const titles: Record<string, string> = {
    session_start: 'Session 开始',
    task_start: '任务启动',
    task_progress: '任务进展',
    task_complete: '任务完成',
    session_complete: 'Session 完成'
  }
  const n = new Notification({
    title: titles[data.type] || '任务更新',
    body: data.task_name || data.task_summary || '收到新的任务更新',
    silent: false
  })
  n.show()
}

/** 创建主窗口 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    // macOS Sequoia (15.x) 上 transparent:true + vibrancy 会导致黑屏
    // 不设置 transparent，直接用 vibrancy 即可获得毛玻璃效果
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#f5f5f5',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  })

  // 窗口准备好后显示，并打印调试信息
  mainWindow.on('ready-to-show', () => {
    console.log('[Main] 窗口 ready-to-show，准备显示')
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (!(app as ExtendedApp).isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  // 监听渲染进程页面加载状态，便于排查黑屏/白屏问题
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('[Renderer] 页面开始加载')
  })
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Renderer] 页面加载完成 (did-finish-load)')
  })
  mainWindow.webContents.on('dom-ready', () => {
    console.log('[Renderer] DOM 已就绪 (dom-ready)')
  })
  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error(`[Renderer] 页面加载失败: code=${code}, desc=${desc}`)
  })
  // 将渲染进程 console.log 转发到主进程终端
  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    const tag = ['LOG', 'WARN', 'ERR'][level] || 'LOG'
    console.log(`[Renderer:${tag}] ${message}  (${sourceId}:${line})`)
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    console.log(`[Main] 加载开发服务器 URL: ${process.env.ELECTRON_RENDERER_URL}`)
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    const htmlPath = path.join(__dirname, '../renderer/index.html')
    console.log(`[Main] 加载本地 HTML: ${htmlPath}`)
    mainWindow.loadFile(htmlPath)
  }
}

/** 创建系统托盘 */
function createTray() {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADpSURBVDiNpZMxDoJAEEXfLhZewMRb2FjoGbyBd7Cw8A5ew9LGxspTeAMvIIkxRotiF8dlWfh2MsXO/Jl/ZjZA4Qig/I3oKiIiYl3XfZqm6dq27QmQBFgBlhSAeZ4fr9frbdu254hYEWIJkLtEdBSR8zzPVyLiGGLBCPjt9/tTKeUB0NcQvAK8EATBrmmaBeCRGlIA5na7Pa+67gYwVRc4X0FdN5fL0zDP8w2g8Qo+gCul3A+CYAloeQXvQE0I4e16vSaATltg9ABkAMdxnIyI8gSY/QeSAJIkOR4sywqBJoFUWw/Iy/l/OW/WmGWlNFBPNwAAAABJRU5ErkJggg=='
  )

  if (tray) tray.destroy()
  tray = new Tray(icon)
  tray.setToolTip('CodeBoard - VibeCoding 多项目看板')

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示看板', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { label: `服务: ${currentHost}:${currentPort}`, enabled: false },
    { type: 'separator' },
    { label: '退出 CodeBoard', click: () => { (app as ExtendedApp).isQuitting = true; app.quit() } }
  ])
  tray.setContextMenu(contextMenu)
  tray.on('click', () => { mainWindow?.show(); mainWindow?.focus() })
}

/**
 * 安全调用 API，失败时返回默认值而非抛出异常
 * 避免服务器未启动时前端 IPC 调用全部崩溃导致白屏
 */
async function safeApiGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const r = await apiGet(path) as Record<string, unknown>
    return (r.data as T) ?? fallback
  } catch (err) {
    console.warn(`[IPC] API 请求失败 (${path}):`, (err as Error).message)
    return fallback
  }
}

/** 注册 IPC 处理器 */
function registerIpcHandlers() {
  // 读取类请求：服务器不可用时返回空默认值，确保前端能正常渲染
  ipcMain.handle('get-projects', async () => safeApiGet('/api/projects', []))
  ipcMain.handle('get-project', async (_, pid: string) => safeApiGet(`/api/projects/${pid}`, null))
  ipcMain.handle('get-sessions', async (_, pid: string) => safeApiGet(`/api/sessions/${pid}`, []))
  ipcMain.handle('get-task-updates', async (_, sid: string) => {
    try {
      const r = await apiGet(`/api/tasks/${sid}`) as Record<string, unknown>
      return { updates: r.data ?? [], session: r.session ?? null }
    } catch (err) {
      console.warn(`[IPC] API 请求失败 (/api/tasks/${sid}):`, (err as Error).message)
      return { updates: [], session: null }
    }
  })
  ipcMain.handle('get-memory-categories', async (_, pid: string) => safeApiGet(`/api/memories/${pid}/categories`, []))
  ipcMain.handle('get-memory-documents', async (_, pid: string, cid?: number) => {
    const q = cid ? `?category_id=${cid}` : ''
    return safeApiGet(`/api/memories/${pid}/documents${q}`, [])
  })
  ipcMain.handle('get-memory-content', async () => null)
  ipcMain.handle('get-settings', async () => safeApiGet('/api/settings', {}))
  ipcMain.handle('get-unread-notifications', async () => safeApiGet('/api/notifications/unread', []))
  ipcMain.handle('get-project-notifications', async (_, pid: string) => safeApiGet(`/api/notifications/${pid}`, []))
  ipcMain.handle('get-recommendations', async () => safeApiGet('/api/recommendations', { activeSessions: [], staleProjects: [], withPrompts: [] }))

  // 写入类请求：保留异常抛出以便前端感知失败
  ipcMain.handle('update-settings', async (_, settings: Record<string, string>) => apiPut('/api/settings', settings))
  ipcMain.handle('mark-notifications-read', async (_, pid?: string) => apiPost('/api/notifications/read', { project_id: pid }))
  ipcMain.handle('update-project-status', async (_, pid: string, status: string) => apiPatch(`/api/projects/${pid}/status`, { status }))
  ipcMain.handle('update-project-color', async (_, pid: string, color: string) => apiPatch(`/api/projects/${pid}/color`, { color }))
  ipcMain.handle('delete-project', async (_, pid: string) => apiDelete(`/api/projects/${pid}`))
  ipcMain.handle('update-session-prompt', async (_, sid: string, text: string) => apiPut(`/api/sessions/${sid}`, { prompt_text: text }))
  // ---- 头像管理 ----
  ipcMain.handle('select-avatar', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择头像图片',
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths.length) return null
    // 读取文件并转为 data URL
    const filePath = result.filePaths[0]
    const ext = path.extname(filePath).toLowerCase().replace('.', '')
    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
    const buf = fs.readFileSync(filePath)
    return `data:${mime};base64,${buf.toString('base64')}`
  })

  ipcMain.handle('save-avatar', async (_, dataUrl: string) => {
    const avatarDir = path.join(app.getPath('userData'), 'data')
    if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true })
    const avatarPath = path.join(avatarDir, 'avatar.txt')
    fs.writeFileSync(avatarPath, dataUrl, 'utf-8')
    return { success: true }
  })

  ipcMain.handle('get-avatar', async () => {
    const avatarPath = path.join(app.getPath('userData'), 'data', 'avatar.txt')
    if (fs.existsSync(avatarPath)) return fs.readFileSync(avatarPath, 'utf-8')
    return null
  })

  // ---- Skills 文件保存（弹出目录选择对话框，保存到用户指定位置） ----
  ipcMain.handle('save-skills-file', async (_, content: string) => {
    if (!mainWindow) return { success: false }
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '保存 CodeBoard Skills 文件',
      defaultPath: 'SKILL.md',
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (result.canceled || !result.filePath) return { success: false }
    fs.writeFileSync(result.filePath, content, 'utf-8')
    return { success: true, path: result.filePath }
  })

  // ---- Skills 目录包：读取 skills/codeboard/ 下所有文件并返回文件树 ----
  ipcMain.handle('get-skills-bundle', async () => {
    // 尝试从仓库目录读取 skills 文件
    const appRoot = app.getAppPath()
    const skillsDir = path.join(appRoot, 'skills', 'codeboard')
    const files: { path: string; name: string; content: string }[] = []

    try {
      // 读取 SKILL.md 主文件，替换默认地址为当前运行地址
      const skillMdPath = path.join(skillsDir, 'SKILL.md')
      if (fs.existsSync(skillMdPath)) {
        let content = fs.readFileSync(skillMdPath, 'utf-8')
        // 将默认地址替换为当前实际运行地址
        content = content.replace(/http:\/\/127\.0\.0\.1:2585/g, `http://${currentHost}:${currentPort}`)
        files.push({ path: 'SKILL.md', name: 'SKILL.md', content })
      }

      // 读取 references/ 目录下的所有 .md 文件
      const refsDir = path.join(skillsDir, 'references')
      if (fs.existsSync(refsDir)) {
        const refFiles = fs.readdirSync(refsDir)
          .filter(f => f.endsWith('.md'))
          .sort()
        for (const rf of refFiles) {
          let content = fs.readFileSync(path.join(refsDir, rf), 'utf-8')
          content = content.replace(/http:\/\/127\.0\.0\.1:2585/g, `http://${currentHost}:${currentPort}`)
          files.push({ path: `references/${rf}`, name: rf, content })
        }
      }
    } catch (err) {
      console.warn('[IPC] 读取 skills 目录失败:', (err as Error).message)
    }

    // 如果读取失败（如打包环境无仓库），使用生成器产出单文件
    if (files.length === 0) {
      try {
        const r = await apiGet(`/api/skills/generate?host=${currentHost}&port=${currentPort}`) as Record<string, unknown>
        const data = r.data as { content: string }
        if (data?.content) {
          files.push({ path: 'SKILL.md', name: 'SKILL.md', content: data.content })
        }
      } catch { /* 忽略 */ }
    }

    return { success: true, files }
  })

  // ---- Skills 目录保存：将完整 skills 包保存到用户选择的目录 ----
  ipcMain.handle('save-skills-bundle', async (_, bundleFiles: { path: string; content: string }[]) => {
    if (!mainWindow) return { success: false }
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择 Skills 保存目录（将创建 codeboard/ 子目录）',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || !result.filePaths.length) return { success: false }

    const targetDir = path.join(result.filePaths[0], 'codeboard')
    // 创建目录结构
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })
    const refsDir = path.join(targetDir, 'references')
    if (!fs.existsSync(refsDir)) fs.mkdirSync(refsDir, { recursive: true })

    // 写入所有文件
    for (const file of bundleFiles) {
      const filePath = path.join(targetDir, file.path)
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(filePath, file.content, 'utf-8')
    }

    return { success: true, path: targetDir }
  })

  // ---- Session 垃圾篓操作 ----
  ipcMain.handle('trash-session', async (_, sid: string) => apiPatch(`/api/sessions/${sid}/trash`, {}))
  ipcMain.handle('restore-session', async (_, sid: string) => apiPatch(`/api/sessions/${sid}/restore`, {}))
  ipcMain.handle('permanent-delete-session', async (_, sid: string) => apiDelete(`/api/sessions/${sid}/permanent`))
  ipcMain.handle('get-trashed-sessions', async () => safeApiGet('/api/sessions/trashed/all', []))
  ipcMain.handle('clear-trashed-sessions', async () => apiDelete('/api/sessions/trashed/clear'))

  // ---- 项目垃圾篓批量清空 ----
  ipcMain.handle('clear-trashed-projects', async () => {
    const trashed = await safeApiGet<Record<string, unknown>[]>('/api/projects', [])
    const trashedProjects = trashed.filter(p => p.status === 'trashed')
    for (const p of trashedProjects) {
      await apiDelete(`/api/projects/${p.project_id}`)
    }
    return { success: true, count: trashedProjects.length }
  })

  ipcMain.handle('get-server-info', () => ({ host: currentHost, port: currentPort }))
  ipcMain.handle('restart-server', async (_, host: string, port: number) => {
    currentHost = host; currentPort = port
    await startServerProcess(host, port)
    createTray()
    return { success: true, host, port }
  })
}

// ---- 应用启动 ----

app.whenReady().then(async () => {
  registerIpcHandlers()

  const initialPort = currentPort
  const PORT_TRY_MAX = 12 // 从 initialPort 起最多尝试连续端口数量

  // 启动 API 服务器：先尝试当前端口；若占用则递增端口，避免与已运行的 CodeBoard/CLI 冲突
  let serverStarted = false
  for (let p = 0; p < PORT_TRY_MAX; p++) {
    const tryPort = initialPort + p
    if (p > 0) {
      console.log(`[Main] 尝试备用端口 ${tryPort}…`)
      currentPort = tryPort
    }
    try {
      await startServerProcess(currentHost, currentPort)
      const health = await fetch(`${apiUrl()}/api/health`).then(r => r.json()).catch(() => null)
      if (health?.success) {
        serverStarted = true
        console.log(`[Main] API 服务器启动成功: ${apiUrl()}${p > 0 ? '（已自动切换端口）' : ''}`)
        // 若因占用而换端口，写回设置，便于 Sidebar / CLI 一致
        if (p > 0) {
          try {
            await apiPut('/api/settings', { port: String(currentPort) })
          } catch { /* 离线或写入失败时忽略 */ }
        }
        break
      }
    } catch (err) {
      console.error(`[Main] 端口 ${currentPort} 启动失败:`, (err as Error).message)
    }
  }

  if (serverStarted) {
    // 从 API 读取保存的设置（host 等；port 已在上面与 currentPort 对齐）
    try {
      const r = await apiGet('/api/settings') as Record<string, unknown>
      const settings = r.data as Record<string, string>
      if (settings?.host) currentHost = settings.host
      const savedPort = settings?.port ? parseInt(settings.port, 10) : NaN
      // 仅在当前实例已成功监听 savedPort 时采用，避免误切到未启动的端口
      if (!Number.isNaN(savedPort) && savedPort === currentPort) {
        currentPort = savedPort
      }
    } catch { /* 忽略 */ }
  } else {
    console.error('[Main] API 服务器在可用端口范围内均未能启动，应用将以离线模式运行')
  }

  // 无论服务器是否启动成功，都创建窗口（前端有空状态兜底）
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow?.show()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  (app as ExtendedApp).isQuitting = true
  if (serverProcess) { serverProcess.kill(); serverProcess = null }
})

interface ExtendedApp extends Electron.App { isQuitting?: boolean }
