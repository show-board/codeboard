# CodeBoard 代码风格

## 基本规范

- **语言**: TypeScript（严格模式）
- **编码**: UTF-8
- **缩进**: 2 空格
- **引号**: 单引号优先
- **分号**: 不使用分号（除必要场合）
- **行尾**: LF

## 注释规范（强注释）

### 文件头部注释
每个文件顶部必须有功能说明注释块：

```typescript
// ============================================================
// 组件/模块名称
// 功能描述，一到两行说明
// ============================================================
```

### 函数/方法注释
使用 JSDoc 风格的 `/** */` 注释：

```typescript
/** 保存昵称到数据库 */
const saveNickname = () => { ... }
```

### 中文注释
所有注释使用中文，解释作用、方法或流程。

## React 组件规范

- 函数组件 + Hooks
- 使用 `export default function ComponentName()` 导出
- Props 使用 interface 定义
- 状态管理使用 Zustand store

## 样式规范

- 使用 Tailwind CSS 工具类
- 颜色值使用 Tailwind 预设 + dark 模式变体
- 动画使用 Framer Motion
- 毛玻璃效果：`backdrop-blur-xl bg-white/80 dark:bg-neutral-800/80`
- 圆角统一使用 `rounded-xl` 或 `rounded-2xl`

## 命名规范

- 组件文件：PascalCase（如 `SessionCard.tsx`）
- 工具/store 文件：camelCase（如 `projectStore.ts`）
- CSS 类名：Tailwind 工具类
- 变量/函数：camelCase
- 常量：UPPER_SNAKE_CASE
- 接口：PascalCase + 描述性名称

## 目录约定

- `components/` 下按功能分子目录（Sidebar/Board/Modals 等）
- `stores/` 下按领域分文件
- `hooks/` 下放自定义 Hook
- 通用组件放 `common/`
