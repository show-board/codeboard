import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

// React 应用入口 —— 挂载前打印调试信息，方便排查黑屏/白屏
console.log('[CodeBoard] main.tsx 执行，准备挂载 React 根组件')
const rootEl = document.getElementById('root')
if (!rootEl) {
  console.error('[CodeBoard] 未找到 #root 节点，无法挂载应用')
} else {
  console.log('[CodeBoard] #root 节点已就绪，开始渲染')
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
