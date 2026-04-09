// ============================================================
// Express API 服务器 + Socket.IO 实时通信
// 监听指定端口，提供项目、Session、任务、记忆管理等 API
// ============================================================

import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import projectsRouter from './routes/projects'
import sessionsRouter from './routes/sessions'
import tasksRouter from './routes/tasks'
import memoriesRouter from './routes/memories'
import hooksRouter from './routes/hooks'
import * as db from '../db'
import { generateSkillsTemplate } from './skillsTemplate'

let server: http.Server | null = null
let io: SocketIOServer | null = null

/** 获取 Socket.IO 实例（用于从路由中发送实时消息） */
export function getIO(): SocketIOServer | null {
  return io
}

/** 启动 API 服务器 */
export function startServer(
  host: string = '127.0.0.1',
  port: number = 2585,
  onNotification?: (data: unknown) => void
): Promise<{ host: string; port: number }> {
  return new Promise((resolve, reject) => {
    // 如果服务器已运行，先关闭
    if (server) {
      server.close()
    }

    const app = express()

    // 中间件
    app.use(cors())
    app.use(express.json({ limit: '10mb' }))

    // 请求日志（开发环境）
    app.use((req, _res, next) => {
      console.log(`[API] ${req.method} ${req.path}`)
      next()
    })

    // 注册路由
    app.use('/api/projects', projectsRouter)
    app.use('/api/sessions', sessionsRouter)
    app.use('/api/tasks', wrapTaskRouterWithSocket(onNotification))
    app.use('/api/memories', memoriesRouter)
    app.use('/api/hooks', hooksRouter)

    // 健康检查
    app.get('/api/health', (_req, res) => {
      res.json({ success: true, message: 'CodeBoard API 运行正常', timestamp: new Date().toISOString() })
    })

    // 推荐系统
    app.get('/api/recommendations', (_req, res) => {
      const recommendations = db.getRecommendations()
      res.json({ success: true, data: recommendations })
    })

    // 用户设置
    app.get('/api/settings', (_req, res) => {
      const settings = db.getSettings()
      res.json({ success: true, data: settings })
    })
    app.put('/api/settings', (req, res) => {
      const result = db.updateSettings(req.body)
      res.json(result)
    })

    // 通知
    app.get('/api/notifications/unread', (_req, res) => {
      const notifications = db.getUnreadNotifications()
      res.json({ success: true, data: notifications })
    })
    app.post('/api/notifications/read', (req, res) => {
      const result = db.markNotificationsRead(req.body.project_id)
      res.json(result)
    })
    // 获取指定项目的通知详情列表（含已读）
    app.get('/api/notifications/:projectId', (_req, res) => {
      const notifications = db.getNotificationsByProject(_req.params.projectId)
      res.json({ success: true, data: notifications })
    })

    // Skills 模板生成端点：根据当前 host:port 生成 Agent 对接 Skills 内容
    app.get('/api/skills/generate', (req, res) => {
      const baseUrl = `http://${req.query.host || host}:${req.query.port || port}`
      res.json({
        success: true,
        data: {
          // Cursor 规范：技能目录内主文件名为 SKILL.md
          filename: 'SKILL.md',
          content: generateSkillsTemplate(baseUrl)
        }
      })
    })

    // API 文档端点：返回所有可用 API 及其格式
    app.get('/api/docs', (_req, res) => {
      res.json({
        success: true,
        data: getApiDocs()
      })
    })

    // 404 处理
    app.use((_req, res) => {
      res.status(404).json({ success: false, error: 'API 路径不存在' })
    })

    // 错误处理
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('[API Error]', err)
      res.status(500).json({ success: false, error: err.message })
    })

    // 创建 HTTP 服务器和 Socket.IO
    server = http.createServer(app)
    io = new SocketIOServer(server, {
      cors: { origin: '*' }
    })

    // Socket.IO 连接处理
    io.on('connection', (socket) => {
      console.log(`[Socket.IO] 客户端已连接: ${socket.id}`)
      socket.on('disconnect', () => {
        console.log(`[Socket.IO] 客户端已断开: ${socket.id}`)
      })
    })

    server.listen(port, host, () => {
      console.log(`[CodeBoard] API 服务已启动: http://${host}:${port}`)
      resolve({ host, port })
    })

    server.on('error', (err) => {
      console.error('[CodeBoard] 服务启动失败:', err)
      reject(err)
    })
  })
}

/** 停止服务器 */
export function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (io) {
      io.close()
      io = null
    }
    if (server) {
      server.close(() => resolve())
      server = null
    } else {
      resolve()
    }
  })
}

/**
 * 包装任务路由：在任务更新时通过 Socket.IO 广播通知
 * 并调用 Electron 主进程的通知回调
 */
function wrapTaskRouterWithSocket(onNotification?: (data: unknown) => void) {
  const router = express.Router()

  // 使用原始任务路由
  router.use('/', tasksRouter)

  // 在任务更新后，通过后置中间件广播 Socket.IO 事件
  const originalPost = router.stack.find((layer) => {
    const route = (layer as unknown as {
      route?: { path?: string; methods?: Record<string, boolean>; stack?: { handle: (...args: unknown[]) => void }[] }
    }).route
    return route?.path === '/update' && !!route?.methods?.post
  }) as {
    route?: { stack?: { handle: (req: express.Request, res: express.Response, next: express.NextFunction) => void }[] }
  } | undefined

  if (originalPost?.route?.stack?.[0]) {
    const originalHandler = originalPost.route.stack[0].handle
    originalPost.route.stack[0].handle = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      // 捕获原始 json 方法以在发送响应后广播
      const originalJson = res.json.bind(res)
      res.json = ((data: Record<string, unknown>) => {
        // 广播 Socket.IO 事件
        if (data.success && io) {
          io.emit('task-update', { ...req.body, timestamp: new Date().toISOString() })
        }
        // 触发 Electron 通知
        if (data.success && onNotification) {
          onNotification(req.body)
        }
        return originalJson(data)
      }) as typeof res.json
      originalHandler(req, res, next)
    }
  }

  return router
}

/** 获取 API 文档定义 */
function getApiDocs() {
  return [
    {
      group: '项目管理',
      apis: [
        { method: 'POST', path: '/api/projects/register', description: '注册新项目', body: { project_id: 'string (必填)', name: 'string (必填)', description: 'string' } },
        { method: 'GET', path: '/api/projects', description: '获取所有项目列表' },
        { method: 'GET', path: '/api/projects/:projectId', description: '获取单个项目详情' },
        { method: 'PUT', path: '/api/projects/:projectId', description: '更新项目信息', body: { name: 'string', description: 'string' } },
        { method: 'PATCH', path: '/api/projects/:projectId/status', description: '修改项目状态', body: { status: 'visible | hidden | trashed' } },
        { method: 'PATCH', path: '/api/projects/:projectId/color', description: '修改项目颜色', body: { color: 'string (HEX格式 如 #FF0000)' } },
        { method: 'POST', path: '/api/projects/:projectId/test', description: '测试项目连接' },
        { method: 'DELETE', path: '/api/projects/:projectId', description: '永久删除项目(需先移入垃圾篓)' }
      ]
    },
    {
      group: 'Session 管理',
      apis: [
        { method: 'POST', path: '/api/sessions', description: '创建新Session', body: { session_id: 'string (必填)', project_id: 'string (必填)', goal: 'string', task_list: 'array' } },
        { method: 'GET', path: '/api/sessions/:projectId', description: '获取项目的Session列表' },
        { method: 'PUT', path: '/api/sessions/:sessionId', description: '更新Session', body: { status: 'string', summary: 'string', prompt_text: 'string' } }
      ]
    },
    {
      group: '任务更新 (Agent 核心接口)',
      apis: [
        {
          method: 'POST', path: '/api/tasks/update', description: '推送任务状态更新',
          body: {
            project_id: 'string (必填)', session_id: 'string (必填)', task_id: 'string (必填)',
            type: 'session_start | task_start | task_progress | task_complete | session_complete (必填)',
            task_name: 'string', task_plan: 'string', task_summary: 'string',
            content: 'string', task_list: 'array', goal: 'string', summary: 'string'
          }
        },
        { method: 'GET', path: '/api/tasks/:sessionId', description: '获取Session的任务更新记录' }
      ]
    },
    {
      group: '记忆管理',
      apis: [
        { method: 'GET', path: '/api/memories/:projectId/categories', description: '获取记忆分类表' },
        { method: 'POST', path: '/api/memories/:projectId/categories', description: '创建分类', body: { name: 'string (必填)', description: 'string' } },
        { method: 'GET', path: '/api/memories/:projectId/documents', description: '获取记忆文档列表' },
        { method: 'GET', path: '/api/memories/:projectId/documents/:docId', description: '读取文档内容' },
        { method: 'POST', path: '/api/memories/:projectId/documents', description: '创建记忆文档', body: { category_id: 'number (必填)', title: 'string (必填)', content: 'string (必填)', file_name: 'string' } },
        { method: 'PUT', path: '/api/memories/:projectId/documents/:docId', description: '更新文档', body: { title: 'string', content: 'string' } },
        { method: 'DELETE', path: '/api/memories/:projectId/documents/:docId', description: '删除文档' },
        { method: 'POST', path: '/api/memories/:projectId/sync', description: '批量同步记忆', body: { files: '[{category_id, title, file_name, content, action}]' } }
      ]
    },
    {
      group: '系统',
      apis: [
        { method: 'GET', path: '/api/health', description: '健康检查' },
        { method: 'GET', path: '/api/recommendations', description: '获取推荐任务' },
        { method: 'GET', path: '/api/settings', description: '获取用户设置' },
        { method: 'PUT', path: '/api/settings', description: '更新用户设置' },
        { method: 'GET', path: '/api/docs', description: 'API 文档' },
        { method: 'GET', path: '/api/skills/generate', description: '生成 Skills 模板' }
      ]
    },
    {
      group: 'Hooks 事件',
      apis: [
        {
          method: 'POST',
          path: '/api/hooks/events',
          description: '上报单条 hooks 触发事件',
          body: {
            project_id: 'string (必填)',
            session_id: 'string (必填)',
            agent_type: 'cursor | claudecode | openclaw',
            hook_event_name: 'string (必填)',
            status: 'success | error',
            payload: 'object'
          }
        },
        {
          method: 'GET',
          path: '/api/hooks/sessions/:sessionId?limit=300',
          description: '获取 session hooks 统计与明细'
        }
      ]
    }
  ]
}

