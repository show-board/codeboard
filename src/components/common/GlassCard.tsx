// ============================================================
// 毛玻璃圆角卡片通用组件
// Mac 风格的半透明背景、模糊效果、圆角边框
// ============================================================

import { motion, HTMLMotionProps } from 'framer-motion'
import React from 'react'

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  className?: string
  /** 是否作为模态弹窗使用（更强的模糊和阴影） */
  modal?: boolean
}

export default function GlassCard({ children, className = '', modal = false, ...props }: GlassCardProps) {
  const baseClass = modal
    ? 'backdrop-blur-2xl bg-white/90 dark:bg-neutral-800/90 rounded-[20px] border border-white/20 dark:border-white/10 shadow-[0_10px_60px_rgba(0,0,0,0.2)]'
    : 'backdrop-blur-xl bg-white/80 dark:bg-neutral-800/80 rounded-[16px] border border-white/20 dark:border-white/10 shadow-[0_2px_20px_rgba(0,0,0,0.08)]'

  return (
    <motion.div
      className={`${baseClass} ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
