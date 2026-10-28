// Minimal Model Context Protocol client over stdio (newline-delimited JSON-RPC 2.0).
// Used server-side only; the provider CLI keeps its own credentials.
import { spawn } from 'node:child_process'

export class McpStdioClient {
  constructor({ command, args = [], timeoutMs = 120_000 }) {
    this.command = command
    this.args = args
    this.timeoutMs = timeoutMs
    this.nextId = 1
    this.pending = new Map()
    this.buf = ''
  }

  async start() {
    this.proc = spawn(this.command, this.args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, shell: process.platform === 'win32' })
    this.proc.stdout.setEncoding('utf8')
    this.proc.stdout.on('data', (d) => this.onData(d))
    this.proc.stderr.on('data', () => {}) // provider logs are not echoed (may contain account details)
    const exited = new Promise((_, rej) =>
      this.proc.once('error', (e) => rej(new Error(`Could not start ${this.command}: ${e.message}`))),
    )
    this.proc.once('exit', (code) => {
      for (const { reject } of this.pending.values()) reject(new Error(`${this.command} exited (${code})`))
      this.pending.clear()
    })
    await Promise.race([
      this.call('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'etsy-seller-studio', version: '0.1.0' } }),
      exited,
    ])
    this.notify('notifications/initialized', {})
    return this
  }

  onData(chunk) {
    this.buf += chunk
    let i
    while ((i = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, i).trim()
      this.buf = this.buf.slice(i + 1)
      if (!line) continue
      let msg
      try {
        msg = JSON.parse(line)
      } catch {
        continue
      }
      const p = msg.id !== undefined ? this.pending.get(msg.id) : null
      if (!p) continue
      this.pending.delete(msg.id)
      clearTimeout(p.timer)
      if (msg.error) p.reject(new Error(msg.error.message || 'MCP error'))
      else p.resolve(msg.result)
    }
  }

  call(method, params) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`MCP ${method} timed out`))
      }, this.timeoutMs)
      this.pending.set(id, { resolve, reject, timer })
      this.proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
    })
  }

  notify(method, params) {
    this.proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n')
  }

  async listTools() {
    const r = await this.call('tools/list', {})
    return r?.tools ?? []
  }

  async callTool(name, args) {
    const r = await this.call('tools/call', { name, arguments: args })
    if (r?.isError) throw new Error(textOf(r) || `${name} failed`)
    return r
  }

  close() {
    try {
      this.proc?.kill()
    } catch {
      /* already gone */
    }
  }
}

export function textOf(result) {
  return (result?.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('\n')
}

/** Tool results are usually JSON in a text block; fall back to structuredContent. */
export function jsonOf(result) {
  if (result?.structuredContent) return result.structuredContent
  const t = textOf(result)
  try {
    return JSON.parse(t)
  } catch {
    const m = t.match(/[[{][\s\S]*[\]}]/)
    if (m) {
      try {
        return JSON.parse(m[0])
      } catch {
        /* not JSON */
      }
    }
    return { text: t }
  }
}
