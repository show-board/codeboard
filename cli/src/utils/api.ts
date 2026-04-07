// ============================================================
// HTTP 请求工具
// 封装与 CodeBoard API 服务器的通信
// ============================================================

import fs from 'fs'
import path from 'path'
import os from 'os'

/** CLI 配置文件路径 */
const CONFIG_PATH = path.join(os.homedir(), '.codeboard', 'config.json')

/** 默认配置 */
interface Config {
  host: string
  port: number
}

/** 读取 CLI 配置 */
export function getConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
      return JSON.parse(raw)
    }
  } catch {}
  return { host: '127.0.0.1', port: 2585 }
}

/** 保存 CLI 配置 */
export function saveConfig(config: Partial<Config>): void {
  const existing = getConfig()
  const merged = { ...existing, ...config }
  const dir = path.dirname(CONFIG_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2))
}

/** 获取 API 基础 URL */
export function getBaseUrl(): string {
  const { host, port } = getConfig()
  return `http://${host}:${port}`
}

/** 通用 GET 请求 */
export async function apiGet(path: string): Promise<unknown> {
  const url = `${getBaseUrl()}${path}`
  const res = await fetch(url)
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`请求失败 [${res.status}]: ${errBody}`)
  }
  return res.json()
}

/** 通用 POST 请求 */
export async function apiPost(path: string, body: unknown): Promise<unknown> {
  const url = `${getBaseUrl()}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`请求失败 [${res.status}]: ${errBody}`)
  }
  return res.json()
}

/** 通用 PUT 请求 */
export async function apiPut(path: string, body: unknown): Promise<unknown> {
  const url = `${getBaseUrl()}${path}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`请求失败 [${res.status}]: ${errBody}`)
  }
  return res.json()
}

/** 通用 PATCH 请求 */
export async function apiPatch(path: string, body: unknown): Promise<unknown> {
  const url = `${getBaseUrl()}${path}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()
}

/** 通用 DELETE 请求 */
export async function apiDelete(path: string): Promise<unknown> {
  const url = `${getBaseUrl()}${path}`
  const res = await fetch(url, { method: 'DELETE' })
  return res.json()
}
