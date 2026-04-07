// ============================================================
// 虚化背景遮罩
// 弹窗打开时，主界面显示虚化效果
// ============================================================

import { motion } from 'framer-motion'

interface BlurOverlayProps {
  onClick?: () => void
}

export default function BlurOverlay({ onClick }: BlurOverlayProps) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
    />
  )
}
