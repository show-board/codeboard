# Bug 记录与踩坑记录

## Electron 相关

### BUG-001: macOS Sequoia 上 transparent + vibrancy 导致黑屏
- **现象**: Electron 窗口设置 `transparent: true` + `vibrancy` 时全黑
- **原因**: macOS 15.x (Sequoia) 对透明窗口的渲染行为变更
- **修复**: 不设置 `transparent`，仅使用 `vibrancy: 'under-window'` + `backgroundColor: '#f5f5f5'`
- **文件**: `electron/main/index.ts`

### BUG-002: better-sqlite3 ABI 不兼容
- **现象**: Electron 内置 Node.js 运行 better-sqlite3 报 ABI 版本不匹配错误
- **原因**: Electron 打包的 Node 版本与 native module 编译版本不一致
- **修复**: API 服务器改为独立子进程运行（使用系统 Node.js `which node`）
- **文件**: `electron/main/index.ts` (startServerProcess), `electron/main/server/standalone.ts`

### BUG-003: 端口被占用导致启动失败
- **现象**: 多个 CodeBoard 实例或 CLI 占用 2585 端口
- **修复**: 启动时自动尝试 2585-2596 共 12 个端口，找到可用端口后写入 settings
- **文件**: `electron/main/index.ts`

## React/前端 相关

### BUG-004: Zustand selector 导致无限循环
- **现象**: 在 selector 中使用 `s.sessions[projectId] || []` 导致每次渲染创建新数组引用，触发无限重渲染
- **修复**: 使用 `useMemo` 包裹，避免在 selector 中创建新引用
- **文件**: `src/components/Board/ProjectColumn.tsx`, `src/components/Modals/TaskDetail.tsx`

### BUG-005: API详情弹窗被Sidebar限制宽度
- **现象**: ApiDetail弹窗虽使用 `position: fixed` 和 `w-[90vw]`，但实际只在Sidebar宽度内显示
- **原因**: Sidebar 的 `backdrop-blur-xl` 创建了新的 CSS containing block，导致 `position: fixed` 子元素相对于 Sidebar 定位而非 viewport
- **修复**: 使用 `createPortal(modal, document.body)` 将弹窗渲染到 body，脱离 Sidebar 的 DOM 树
- **文件**: `src/components/Sidebar/ApiDetail.tsx`

### BUG-006: 帮助按钮点击无反应
- **现象**: Sidebar左上角帮助按钮（?图标）点击后不弹出弹窗
- **原因**: CSS类名拼写错误 — 代码中写的 `titlebar-nodrag`，但 CSS 定义的是 `titlebar-no-drag`（带连字符），按钮仍在窗口拖拽区域中
- **修复**: 将 `titlebar-nodrag` 改为 `titlebar-no-drag`
- **文件**: `src/components/Sidebar/index.tsx`

### BUG-007: Session 卡片右键删除无效
- **现象**: 右键点击 Session 卡片弹出菜单，点击"删除卡片"无反应
- **原因**: 1) 右键菜单使用 `fixed` 定位但被父元素 `overflow:hidden` / `transform` 裁剪；2) 事件冒泡导致卡片的 `onClick`（打开详情）拦截了删除操作
- **修复**: 右键菜单改用 `createPortal(menu, document.body)` 渲染到 body 层（z-9999），所有按钮添加 `onClick` 和 `onMouseDown` 的 `stopPropagation()`
- **文件**: `src/components/SessionCard/index.tsx`

### BUG-008: 通知详情弹窗显示为空
- **现象**: MessageBar 显示未读数量正确，但点击色块打开 NotificationDetail 弹窗后显示"暂无消息记录"
- **原因**: useEffect 中同时调用 `getProjectNotifications` 和 `markNotificationsRead`，后者触发 store 更新可能产生时序冲突
- **修复**: 分离数据加载和已读标记——加载时不标记已读，关闭弹窗时才执行 `markNotificationsRead`；添加 store 未读通知作为回退数据源
- **文件**: `src/components/Modals/NotificationDetail.tsx`

## 需要避免的问题

- 不要在 Zustand selector 中创建新对象/数组，会导致无限循环
- Electron preload 脚本中不能使用 `require`，必须用 `contextBridge`
- macOS 上 transparent window 慎用，容易导致渲染问题
- Native module 在 Electron 中需要特殊处理（rebuild 或子进程隔离）
- 父元素有 `backdrop-filter` / `filter` / `transform` 时，子元素的 `position: fixed` 会相对于该父元素定位而非 viewport，必须使用 Portal 逃逸
- CSS 类名必须与 HTML 中使用的完全一致，包括连字符，特别是 `-webkit-app-region` 相关的自定义类
- 右键菜单等浮层组件必须使用 `createPortal` 渲染到 body，避免被 overflow/transform 裁剪
- useEffect 中避免同时执行互相影响的异步操作（如加载数据和标记已读），应分离时机
