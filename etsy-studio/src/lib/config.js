import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Minimal .env parser: KEY=VALUE, # comments, optional quotes. Existing process env wins. */
export function loadEnvFile(file = path.join(ROOT, '.env')) {
  if (!fs.existsSync(file)) return {}
  const out = {}
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1)
    out[key] = value
  }
  return out
}

let cached
export function getConfig({ reload = false } = {}) {
  if (cached && !reload) return cached
  const env = { ...loadEnvFile(), ...process.env }
  const dataDir = path.resolve(env.STUDIO_DATA_DIR || path.join(ROOT, 'data'))
  const int = (k, d) => (Number.isFinite(Number(env[k])) && env[k] !== '' && env[k] !== undefined ? Number(env[k]) : d)
  const writes = env.ETSY_ENABLE_WRITES === '1'
  cached = {
    env,
    etsy: {
      keystring: env.ETSY_KEYSTRING || '',
      sharedSecret: env.ETSY_SHARED_SECRET || '',
      redirectUri: env.ETSY_REDIRECT_URI || 'https://localhost:3003/oauth/callback',
      authPort: int('ETSY_AUTH_PORT', 3003),
      writesEnabled: writes,
      // Least privilege. billing_r, listings_d, shops_w, transactions_w, email/address/profile are never requested.
      scopes: ['listings_r', 'shops_r', 'transactions_r', ...(writes ? ['listings_w'] : [])],
      receiptMonths: int('SYNC_RECEIPT_MONTHS', 24),
      apiBase: env.ETSY_API_BASE || 'https://api.etsy.com/v3',
    },
    // STUDIO_PUBLIC_DEMO=1: a hosted, demo-only copy (fictional shop, no Etsy/Krafie connections).
    publicDemo: env.STUDIO_PUBLIC_DEMO === '1',
    dashboard: env.STUDIO_PUBLIC_DEMO === '1'
      ? { host: '0.0.0.0', port: int('PORT', 10000) }
      : { host: '127.0.0.1', port: int('DASHBOARD_PORT', 3000) },
    krafie: {
      command: env.KRAFIE_MCP_COMMAND || 'krafie-mcp',
      args: (env.KRAFIE_MCP_ARGS || '').split(' ').filter(Boolean),
      seeds: (env.RESEARCH_SEEDS || '').split(',').map((s) => s.trim()).filter(Boolean),
    },
    kreatorium: { mockupUrl: env.KREATORIUM_MOCKUP_URL || '' },
    schedule: { etsyHours: int('SCHEDULE_ETSY_HOURS', 0), researchHours: int('SCHEDULE_RESEARCH_HOURS', 0) },
    vault: env.STUDIO_VAULT || 'auto',
    paths: {
      data: dataDir,
      raw: path.join(dataDir, 'raw'),
      research: path.join(dataDir, 'research'),
      imports: path.join(dataDir, 'imports', 'marketplace-insights'),
      assets: path.join(dataDir, 'assets'),
      app: path.join(dataDir, 'app'),
      db: path.join(dataDir, 'app', 'studio.db'),
      certs: path.join(ROOT, 'certs'),
      dashboard: path.join(ROOT, 'dashboard'),
    },
  }
  return cached
}

export function ensureDirs(cfg = getConfig()) {
  for (const p of [cfg.paths.raw, cfg.paths.research, cfg.paths.imports, cfg.paths.assets, cfg.paths.app]) {
    fs.mkdirSync(p, { recursive: true })
  }
}

/**
 * Etsy limits used for local validation. Etsy validates again server-side; these mirror Etsy's
 * published rules at the time of writing — confirm against the current Open API docs (Etsy Dev MCP)
 * before relying on them, and adjust here only.
 */
export const ETSY_LIMITS = {
  titleMaxChars: 140,
  tagsMax: 13,
  tagMaxChars: 20,
  materialsMax: 13,
  imagesMax: 10,
  imageMaxBytes: 20 * 1024 * 1024,
  altTextMaxChars: 250,
  filesMax: 5,
  fileMaxBytes: 20 * 1024 * 1024,
  videoMaxBytes: 100 * 1024 * 1024,
  quantityMax: 999,
  minPrice: 0.2,
  personalizationCharMax: 1024,
}

export const WHO_MADE = ['i_did', 'someone_else', 'collective']
export const WHEN_MADE = [
  'made_to_order', '2020_2026', '2020_2025', '2010_2019', '2007_2009', 'before_2007', '2000_2006', '1990s', '1980s',
  '1970s', '1960s', '1950s', '1940s', '1930s', '1920s', '1910s', '1900s', '1800s', '1700s', 'before_1700',
]

export const ETSY_DISCLOSURE =
  "The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc."
