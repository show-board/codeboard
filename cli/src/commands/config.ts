// ============================================================
// codeboard config 命令
// 配置 CLI 工具连接的 CodeBoard 服务地址
// ============================================================

import { Command } from 'commander'
import { getConfig, saveConfig } from '../utils/api'

export function registerConfigCommand(program: Command) {
  program
    .command('config')
    .description('配置 CodeBoard 连接地址')
    .option('--host <host>', '服务器地址')
    .option('--port <port>', '服务器端口', parseInt)
    .option('--show', '显示当前配置')
    .action((opts) => {
      if (opts.show || (!opts.host && opts.port === undefined)) {
        const config = getConfig()
        console.log('📋 当前配置:')
        console.log(`   Host: ${config.host}`)
        console.log(`   Port: ${config.port}`)
        console.log(`   URL:  http://${config.host}:${config.port}`)
        return
      }

      const updates: Record<string, unknown> = {}
      if (opts.host) updates.host = opts.host
      if (opts.port !== undefined) updates.port = opts.port
      saveConfig(updates as { host?: string; port?: number })

      const config = getConfig()
      console.log('✅ 配置已更新:')
      console.log(`   URL: http://${config.host}:${config.port}`)
    })
}
