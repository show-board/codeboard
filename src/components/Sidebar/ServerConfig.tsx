// ============================================================
// 服务器配置区域
// 显示当前 Host/Port，支持用户修改并重启后端
// ============================================================

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Server, RefreshCw, Wand2 } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useUIStore } from '../../stores/uiStore'

export default function ServerConfig() {
  const { host, port, restartServer } = useSettingsStore()
  const { setShowSkillsGenerator } = useUIStore()
  const [editing, setEditing] = useState(false)
  const [tempHost, setTempHost] = useState(host)
  const [tempPort, setTempPort] = useState(String(port))
  const [restarting, setRestarting] = useState(false)

  /** 重启服务器 */
  const handleRestart = async () => {
    setRestarting(true)
    try {
      await restartServer(tempHost, parseInt(tempPort, 10))
      setEditing(false)
    } catch (err) {
      console.error('重启失败:', err)
    } finally {
      setRestarting(false)
    }
  }

  return (
    <div className="px-4 py-3 border-t border-gray-200/50 dark:border-gray-700/50">
      <div className="flex items-center gap-2 mb-2">
        <Server className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">服务地址</span>
      </div>

      {editing ? (
        <div className="space-y-2">
          <input
            className="w-full text-xs bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1.5 outline-none border border-gray-200 dark:border-gray-600"
            value={tempHost}
            onChange={e => setTempHost(e.target.value)}
            placeholder="Host"
          />
          <input
            className="w-full text-xs bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1.5 outline-none border border-gray-200 dark:border-gray-600"
            value={tempPort}
            onChange={e => setTempPort(e.target.value)}
            placeholder="Port"
            type="number"
          />
          <div className="flex gap-2">
            <motion.button
              className="flex-1 text-xs bg-blue-500 text-white rounded-lg py-1.5 flex items-center justify-center gap-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRestart}
              disabled={restarting}
            >
              <RefreshCw className={`w-3 h-3 ${restarting ? 'animate-spin' : ''}`} />
              {restarting ? '重启中...' : '重启'}
            </motion.button>
            <button
              className="flex-1 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-lg py-1.5"
              onClick={() => setEditing(false)}
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <motion.div
            className="flex-1 text-xs text-gray-600 dark:text-gray-300 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-mono"
            whileHover={{ scale: 1.01 }}
            onClick={() => { setTempHost(host); setTempPort(String(port)); setEditing(true) }}
          >
            {host}:{port}
          </motion.div>
          {/* Skills 模板生成按钮 */}
          <motion.button
            className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-800/40 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSkillsGenerator(true)}
            title="生成 Skills 模板"
          >
            <Wand2 className="w-3.5 h-3.5 text-purple-500" />
          </motion.button>
        </div>
      )}
    </div>
  )
}
