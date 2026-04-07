# CodeBoard UI 设计风格

## 整体风格

- **Mac 原生风格**：hiddenInset 标题栏、vibrancy 毛玻璃效果
- **配色方案**：跟随 macOS 系统浅色/深色模式自动切换
- **动画**：Framer Motion 弹簧动画、过渡动效

## 布局结构

```
┌─────────────────────────────────────────────┐
│ Sidebar (1/6)  │  展示区 (5/6)              │
│                │  ┌─────────────────────┐   │
│ 头像/昵称      │  │ Toolbar │ MessageBar│   │
│ 服务地址       │  ├─────────────────────┤   │
│ API详情        │  │                     │   │
│ 版本信息       │  │   看板区 (Board)     │   │
│                │  │   横向滚动项目列     │   │
│                │  │                     │   │
│                │  └─────────────────────┘   │
└─────────────────────────────────────────────┘
```

## 组件风格

### 毛玻璃卡片 (GlassCard)
- 普通：`backdrop-blur-xl bg-white/80 dark:bg-neutral-800/80 rounded-[16px]`
- 弹窗：`backdrop-blur-2xl bg-white/90 dark:bg-neutral-800/90 rounded-[20px] shadow-[0_10px_60px_rgba(0,0,0,0.2)]`

### 弹窗遮罩 (BlurOverlay)
- `bg-black/30 backdrop-blur-sm`
- 点击关闭

### 状态颜色
- 排队中：amber-400
- 运行中：blue-400（脉冲动画）
- 已完成：green-400

### 项目颜色
- 每个项目自动分配 HEX 颜色
- 用于项目列边框、消息色块、Session 卡片左侧色条

## 交互设计

### 弹窗
- 全屏居中（fixed inset-0 z-50）
- 入场：scale 0.95 → 1 + opacity 0 → 1
- 出场：反向动画
- API详情/Skills生成器/帮助指南：90vw x 85vh 大弹窗
- 设置弹窗：Portal 渲染到 body，分组配置项 + Toggle 开关

### 卡片
- hover 微上浮 (y: -1) + scale 1.01
- 弹簧动画（stiffness: 300, damping: 30）
- 默认完整展示信息（动态高度），可在设置中切换为固定高度省略模式
- 右键菜单通过 createPortal 渲染到 body (z-9999)，阻止事件冒泡

### 运行状态引导
- 运行中项目：颜色圆点 CSS 闪烁动画（status-blink，1s 周期 step-end）
- 全部 session 完成：绿色细环呼吸发光（status-complete-ring，2s ease-in-out）
- 可在设置中开关

### 展开模式
- 标题栏全宽置顶（headerOnly 模式）
- 下方左半卡片流 + 右半记忆面板 50/50 平分（bodyOnly 模式）

### 横向滚动
- 鼠标拖拽 + 触控板滑动
- scroll-snap 对齐

### 头像交互
- hover 显示相机图标覆层
- 点击调用系统文件选择器
- 裁剪弹窗：圆形预览 + 缩放滑块 + 拖拽定位

## 字体与间距

- 标题：text-lg/text-xl font-semibold
- 正文：text-xs/text-sm
- 极小文字：text-[10px]/text-[11px]
- 间距：space-y-3/space-y-4
- 内边距：p-3/p-4/px-6 py-4
