#!/usr/bin/env node
// ============================================================
// CodeBoard CLI 入口
// 全局命令 `codeboard`，提供项目管理、任务更新、记忆管理等功能
// ============================================================

import { Command } from 'commander'
import { registerConfigCommand } from './commands/config'
import { registerProjectCommand } from './commands/project'
import { registerTaskCommand } from './commands/task'
import { registerMemoryCommand } from './commands/memory'
import { registerStatusCommand } from './commands/status'

const program = new Command()

program
  .name('codeboard')
  .description('CodeBoard CLI - VibeCoding 多项目看板命令行工具')
  .version('1.0.0')

// 注册所有子命令
registerConfigCommand(program)
registerProjectCommand(program)
registerTaskCommand(program)
registerMemoryCommand(program)
registerStatusCommand(program)

// 解析并执行
program.parse(process.argv)

// 无参数时显示帮助
if (!process.argv.slice(2).length) {
  program.outputHelp()
}
