// ============================================================
// SQLite 数据库表结构定义
// 包含项目、Session、任务更新、记忆分类、记忆文档、用户设置
// ============================================================

/** 初始化所有数据库表的 SQL 语句 */
export const CREATE_TABLES_SQL = `
-- 项目表：存储通过 API 注册的所有项目
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT UNIQUE NOT NULL,          -- 来自 project.yaml 的唯一标识
  name TEXT NOT NULL,                       -- 项目名称
  description TEXT DEFAULT '',              -- 项目描述
  color TEXT DEFAULT '#007AFF',             -- 项目专属色（HEX）
  status TEXT DEFAULT 'visible'             -- visible / hidden / trashed
    CHECK(status IN ('visible', 'hidden', 'trashed')),
  created_at DATETIME DEFAULT (datetime('now', 'localtime')),
  updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
);

-- Session 表：每次 Agent 执行任务为一个 Session
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,          -- 时间戳生成的唯一 ID
  project_id TEXT NOT NULL,                 -- 关联项目 ID
  goal TEXT DEFAULT '',                     -- 本次 Session 的总目标
  task_list_json TEXT DEFAULT '[]',         -- 任务列表 JSON 数组
  status TEXT DEFAULT 'queued'              -- queued / running / completed
    CHECK(status IN ('queued', 'running', 'completed')),
  summary TEXT DEFAULT '',                  -- 完成后的总结信息
  prompt_text TEXT DEFAULT '',              -- 期待卡片中用户输入的提示词
  created_at DATETIME DEFAULT (datetime('now', 'localtime')),
  updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

-- 任务更新记录表：Agent 每次上报的状态变更
CREATE TABLE IF NOT EXISTS task_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,                    -- 任务 ID（时间戳生成）
  session_id TEXT NOT NULL,                 -- 关联 Session ID
  project_id TEXT NOT NULL,                 -- 关联项目 ID
  type TEXT NOT NULL                        -- 更新类型
    CHECK(type IN ('session_start', 'task_start', 'task_progress', 'task_complete', 'session_complete')),
  task_name TEXT DEFAULT '',
  task_plan TEXT DEFAULT '',
  task_summary TEXT DEFAULT '',
  content TEXT DEFAULT '',                  -- 详细信息 JSON
  created_at DATETIME DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (session_id) REFERENCES sessions(session_id),
  FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

-- 记忆分类表：每个项目拥有多个记忆分类
CREATE TABLE IF NOT EXISTS memory_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,                       -- 分类名称
  description TEXT DEFAULT '',              -- 分类描述
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  UNIQUE(project_id, name)
);

-- 记忆文档表：每个分类下的 Markdown 文档索引
CREATE TABLE IF NOT EXISTS memory_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  title TEXT NOT NULL,                      -- 文档标题
  file_path TEXT NOT NULL,                  -- 相对路径
  content_hash TEXT DEFAULT '',             -- 内容哈希，用于检测变更
  created_at DATETIME DEFAULT (datetime('now', 'localtime')),
  updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (category_id) REFERENCES memory_categories(id)
);

-- 用户设置表：键值对存储
CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 消息通知表：存储未读消息
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT DEFAULT '',
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

-- Hook 事件表：记录各 Agent hooks 的详细触发轨迹（用于会话统计与审计）
CREATE TABLE IF NOT EXISTS hook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  agent_type TEXT DEFAULT 'unknown',         -- cursor / claudecode / openclaw
  hook_event_name TEXT NOT NULL,             -- 原始 hook 事件名
  event_category TEXT DEFAULT 'other',       -- mcp / tool_call / file_write / ...
  status TEXT DEFAULT 'success'              -- success / error
    CHECK(status IN ('success', 'error')),
  summary TEXT DEFAULT '',                   -- 简短摘要（便于看板快速展示）
  payload_json TEXT DEFAULT '{}',            -- 原始 payload JSON
  created_at DATETIME DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_task_updates_session ON task_updates(session_id);
CREATE INDEX IF NOT EXISTS idx_task_updates_project ON task_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_docs_project ON memory_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_docs_category ON memory_documents(category_id);
CREATE INDEX IF NOT EXISTS idx_notifications_project ON notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_hook_events_project ON hook_events(project_id);
CREATE INDEX IF NOT EXISTS idx_hook_events_session ON hook_events(session_id);
CREATE INDEX IF NOT EXISTS idx_hook_events_category ON hook_events(event_category);
CREATE INDEX IF NOT EXISTS idx_hook_events_created ON hook_events(created_at);
`

/** 默认用户设置 */
export const DEFAULT_SETTINGS = [
  { key: 'nickname', value: 'Coder' },
  { key: 'motto', value: 'Vibe Coding, Build the Future' },
  { key: 'host', value: '127.0.0.1' },
  { key: 'port', value: '2585' }
]

/** 项目注册后创建的默认记忆分类 */
export const DEFAULT_MEMORY_CATEGORIES = [
  { name: 'project-overview', description: '项目功能及目的介绍', sort_order: 1 },
  { name: 'dev-structure', description: '项目开发结构及结构描述', sort_order: 2 },
  { name: 'session-history', description: 'Session 记录及构建历史时间线', sort_order: 3 },
  { name: 'tech-details', description: '技术细节及方案（端口、语言、SQL选型等）', sort_order: 4 },
  { name: 'code-style', description: '项目代码风格（强注释）', sort_order: 5 },
  { name: 'ui-design', description: 'UI 设计风格', sort_order: 6 },
  { name: 'bug-records', description: 'Bug 记录、踩坑、修复记录（分类存储）', sort_order: 7 },
  { name: 'vibe-config', description: 'VibeCoding 配置（必读）', sort_order: 8 },
  { name: 'reusable-code', description: '可复用的类及函数列表及作用', sort_order: 9 }
]
