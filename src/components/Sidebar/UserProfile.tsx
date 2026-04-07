// ============================================================
// 用户信息区域组件
// 显示用户头像（支持本地图片选择 + 1:1 裁剪）、昵称和人生标语
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Edit3, Check, Camera, ZoomIn, ZoomOut, Move } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import BlurOverlay from '../common/BlurOverlay'
import GlassCard from '../common/GlassCard'

/** 头像裁剪弹窗组件 */
function AvatarCropper({
  imageUrl,
  onConfirm,
  onCancel
}: {
  imageUrl: string
  onConfirm: (croppedDataUrl: string) => void
  onCancel: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  // 裁剪区域大小（正方形）
  const CROP_SIZE = 256

  // 加载图片
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      // 初始缩放：让图片短边刚好填满裁剪区域
      const minDim = Math.min(img.width, img.height)
      const initialScale = CROP_SIZE / minDim
      setScale(initialScale)
      setOffset({ x: 0, y: 0 })
    }
    img.src = imageUrl
  }, [imageUrl])

  // 在 canvas 上实时预览
  useEffect(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = CROP_SIZE
    canvas.height = CROP_SIZE
    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE)

    // 绘制圆形裁剪遮罩背景
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, CROP_SIZE, CROP_SIZE)

    // 将图片居中绘制（基于 offset 和 scale）
    const drawW = img.width * scale
    const drawH = img.height * scale
    const dx = (CROP_SIZE - drawW) / 2 + offset.x
    const dy = (CROP_SIZE - drawH) / 2 + offset.y
    ctx.drawImage(img, dx, dy, drawW, drawH)
  }, [scale, offset])

  /** 拖拽移动图片 */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }, [offset])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy })
  }, [dragging])

  const handleMouseUp = useCallback(() => setDragging(false), [])

  /** 确认裁剪 */
  const handleConfirm = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    // 导出为 128x128 的 1:1 正方形图片
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = 128
    exportCanvas.height = 128
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return
    // 绘制圆形剪切
    ctx.beginPath()
    ctx.arc(64, 64, 64, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(canvas, 0, 0, CROP_SIZE, CROP_SIZE, 0, 0, 128, 128)
    onConfirm(exportCanvas.toDataURL('image/png'))
  }

  return (
    <>
      <BlurOverlay onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8 pointer-events-none">
        <GlassCard modal className="w-[360px] pointer-events-auto flex flex-col items-center p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">裁剪头像（1:1）</h3>

          {/* 裁剪预览区 */}
          <div
            className="relative w-[256px] h-[256px] rounded-full overflow-hidden border-2 border-blue-400 cursor-move select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas ref={canvasRef} width={CROP_SIZE} height={CROP_SIZE} className="w-full h-full" />
            {/* 拖拽提示 */}
            {!dragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                <Move className="w-6 h-6 text-white/60" />
              </div>
            )}
          </div>

          {/* 缩放控制 */}
          <div className="flex items-center gap-3 mt-4">
            <button
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              onClick={() => setScale(s => Math.max(0.1, s * 0.85))}
            >
              <ZoomOut className="w-4 h-4 text-gray-500" />
            </button>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.01"
              value={scale}
              onChange={e => setScale(Number(e.target.value))}
              className="w-32 accent-blue-500"
            />
            <button
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              onClick={() => setScale(s => Math.min(5, s * 1.15))}
            >
              <ZoomIn className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 mt-5 w-full">
            <button
              className="flex-1 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-xl py-2"
              onClick={onCancel}
            >
              取消
            </button>
            <motion.button
              className="flex-1 text-xs text-white bg-blue-500 rounded-xl py-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleConfirm}
            >
              应用头像
            </motion.button>
          </div>
        </GlassCard>
      </div>
    </>
  )
}

export default function UserProfile() {
  const { nickname, motto, avatar, updateNickname, updateMotto, updateAvatar } = useSettingsStore()
  const [editingNickname, setEditingNickname] = useState(false)
  const [editingMotto, setEditingMotto] = useState(false)
  const [tempNickname, setTempNickname] = useState(nickname)
  const [tempMotto, setTempMotto] = useState(motto)
  const [cropImage, setCropImage] = useState<string | null>(null)

  /** 保存昵称 */
  const saveNickname = () => {
    if (tempNickname.trim()) {
      updateNickname(tempNickname.trim())
    }
    setEditingNickname(false)
  }

  /** 保存标语 */
  const saveMotto = () => {
    updateMotto(tempMotto.trim())
    setEditingMotto(false)
  }

  /** 选择头像图片 */
  const handleSelectAvatar = async () => {
    const dataUrl = await window.codeboard.selectAvatar()
    if (dataUrl) {
      setCropImage(dataUrl)
    }
  }

  /** 裁剪确认后保存头像 */
  const handleCropConfirm = async (croppedDataUrl: string) => {
    await updateAvatar(croppedDataUrl)
    setCropImage(null)
  }

  return (
    <div className="flex flex-col items-center px-4 pt-12 pb-4 space-y-4">
      {/* 头像区域 - 点击选择本地图片 */}
      <motion.div
        className="relative w-16 h-16 rounded-full shadow-lg cursor-pointer group"
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 400 }}
        onClick={handleSelectAvatar}
      >
        {avatar ? (
          <img src={avatar} alt="头像" className="w-full h-full rounded-full object-cover" />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
        )}
        {/* 悬停时显示相机图标 */}
        <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="w-5 h-5 text-white" />
        </div>
      </motion.div>

      {/* 昵称 */}
      <div className="flex items-center gap-2 w-full justify-center">
        {editingNickname ? (
          <div className="flex items-center gap-1">
            <input
              className="bg-transparent border-b border-gray-400 dark:border-gray-500 text-center text-lg font-semibold outline-none w-24 text-gray-800 dark:text-gray-200"
              value={tempNickname}
              onChange={e => setTempNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveNickname()}
              autoFocus
            />
            <button onClick={saveNickname} className="text-green-500 hover:text-green-600">
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 group cursor-pointer" onClick={() => { setTempNickname(nickname); setEditingNickname(true) }}>
            <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">{nickname}</span>
            <Edit3 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>

      {/* 人生标语 */}
      <div className="w-full text-center">
        {editingMotto ? (
          <div className="flex flex-col items-center gap-1">
            <textarea
              className="bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg text-center text-xs outline-none w-full resize-none p-2 text-gray-500 dark:text-gray-400"
              value={tempMotto}
              onChange={e => setTempMotto(e.target.value)}
              rows={2}
              autoFocus
            />
            <button onClick={saveMotto} className="text-green-500 hover:text-green-600 text-xs">
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <p
            className="text-xs text-gray-500 dark:text-gray-400 italic cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors leading-relaxed"
            onClick={() => { setTempMotto(motto); setEditingMotto(true) }}
          >
            "{motto}"
          </p>
        )}
      </div>

      {/* 头像裁剪弹窗 */}
      <AnimatePresence>
        {cropImage && (
          <AvatarCropper
            imageUrl={cropImage}
            onConfirm={handleCropConfirm}
            onCancel={() => setCropImage(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
