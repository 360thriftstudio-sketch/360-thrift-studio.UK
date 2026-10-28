// Operational logging only. Values that look like credentials are masked before printing.
const SECRET_KEYS = /(token|secret|password|authorization|api[-_]?key|code_verifier|refresh|cookie|email|address|phone)/i

export function redact(value, depth = 0) {
  if (depth > 6) return '[depth]'
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1))
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = SECRET_KEYS.test(k) ? '[redacted]' : redact(v, depth + 1)
    return out
  }
  if (typeof value === 'string') return value.replace(/\b\d+\.[A-Za-z0-9_-]{20,}\b/g, '[redacted-token]')
  return value
}

const fmt = (level, msg, meta) =>
  `${new Date().toISOString()} ${level} ${msg}${meta === undefined ? '' : ' ' + JSON.stringify(redact(meta))}`

export const log = {
  info: (msg, meta) => console.log(fmt('INFO', msg, meta)),
  warn: (msg, meta) => console.warn(fmt('WARN', msg, meta)),
  error: (msg, meta) => console.error(fmt('ERROR', msg, meta)),
}
