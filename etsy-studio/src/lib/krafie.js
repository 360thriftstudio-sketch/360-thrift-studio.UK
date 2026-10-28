// Krafie provider adapter. The rest of the app sees normalised records, never raw MCP shapes.
// Tool names and schemas are discovered at runtime and matched by role, so renamed tools keep working.
// Every Krafie number is a third-party estimate — never official Etsy search or sales data.
import { getConfig } from './config.js'
import { McpStdioClient, jsonOf } from './mcp-client.js'
import { makePng } from './png.js'

export const ROLES = {
  viral: [/viral/i, /high.?perform/i],
  keywords: [/keyword.*opportunit/i, /opportunit.*keyword/i, /keyword/i],
  topShops: [/top.*shop/i],
  snapshots: [/snapshot/i, /momentum/i],
  generateImage: [/^generate_?image$/i, /image.*generat/i],
  generateVideo: [/^generate_?video$/i, /video.*generat/i],
  estimate: [/estimate/i, /cost/i],
  jobStatus: [/job.?status/i, /get_?job/i],
  uploadUrl: [/upload.?url/i],
  download: [/download/i],
  removeBackground: [/background/i],
  upscale: [/upscale/i],
  mockup: [/mockup/i],
  history: [/history/i, /list_?(images|assets|generations)/i],
}

export function mapTools(tools) {
  const out = {}
  for (const [role, patterns] of Object.entries(ROLES)) {
    for (const p of patterns) {
      const t = tools.find((x) => p.test(x.name) && !Object.values(out).some((o) => o.name === x.name))
      if (t) {
        out[role] = t
        break
      }
    }
  }
  return out
}

const pick = (o, keys) => {
  for (const k of keys) if (o?.[k] !== undefined && o[k] !== null && o[k] !== '') return o[k]
  return undefined
}
const num = (v) => {
  if (v === undefined || v === null) return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}
/** Text levels ("low", "high", "rising") → 0-100 so they can be compared. */
const level = (v) => {
  const n = num(v)
  if (n !== null) return n
  const s = String(v ?? '').toLowerCase()
  if (!s) return null
  if (/very high|extreme|hot/.test(s)) return 90
  if (/high|rising|up|growing/.test(s)) return 75
  if (/medium|moderate|stable|steady/.test(s)) return 50
  if (/very low/.test(s)) return 10
  if (/low|falling|down|declin/.test(s)) return 25
  return null
}

/** Find the first array of objects anywhere in a payload. */
export function findRows(payload, depth = 0) {
  if (depth > 5 || !payload) return []
  if (Array.isArray(payload)) return payload.filter((x) => x && typeof x === 'object')
  if (typeof payload === 'object') {
    for (const k of ['results', 'data', 'items', 'keywords', 'listings', 'opportunities', 'shops']) {
      if (Array.isArray(payload[k])) return payload[k]
    }
    for (const v of Object.values(payload)) {
      const r = findRows(v, depth + 1)
      if (r.length) return r
    }
  }
  return []
}

export function normalizeKeyword(o, capturedAt) {
  const keyword = pick(o, ['keyword', 'term', 'query', 'search_term', 'tag', 'phrase', 'name'])
  if (!keyword) return null
  return {
    keyword: String(keyword).toLowerCase().trim(),
    theme: pick(o, ['theme', 'category', 'niche', 'intent']) ?? null,
    opportunity: level(pick(o, ['opportunity', 'opportunity_score', 'score', 'gap_score'])),
    demand: level(pick(o, ['demand', 'search_volume', 'searches', 'volume', 'demand_score'])),
    trend: level(pick(o, ['trend', 'trend_score', 'growth', 'momentum'])),
    competition: level(pick(o, ['competition', 'competition_score', 'competing_listings', 'listings_count'])),
    est_sales: num(pick(o, ['estimated_sales', 'est_sales', 'sales'])),
    confidence: pick(o, ['confidence']) ?? null,
    samples: findRows(pick(o, ['sample_listings', 'listings', 'examples']) ?? []).slice(0, 5).map((x) => normalizeListing(x, capturedAt)).filter(Boolean),
    captured_at: capturedAt,
  }
}

export function normalizeListing(o, capturedAt) {
  const url = pick(o, ['url', 'listing_url', 'link'])
  const title = pick(o, ['title', 'name', 'listing_title'])
  if (!url && !title) return null
  return {
    url: typeof url === 'string' && /^https:\/\/(www\.)?etsy\.com\//.test(url) ? url : null,
    title: title ? String(title).slice(0, 300) : null,
    price: num(pick(o, ['price', 'price_usd', 'amount'])),
    currency: pick(o, ['currency', 'currency_code']) ?? null,
    est_sales: num(pick(o, ['estimated_sales', 'est_sales', 'sales', 'total_sales'])),
    trend: level(pick(o, ['trend', 'momentum', 'growth'])),
    category: pick(o, ['category', 'taxonomy', 'niche']) ?? null,
    shop: pick(o, ['shop_name', 'shop']) ?? null,
    captured_at: capturedAt,
  }
}

/** Live provider over the installed Krafie MCP CLI. */
export class KrafieProvider {
  constructor(cfg = getConfig().krafie) {
    this.cfg = cfg
    this.name = 'krafie'
    this.isDemo = false
  }
  async connect() {
    if (this.client) return this
    this.client = await new McpStdioClient({ command: this.cfg.command, args: this.cfg.args }).start()
    this.tools = mapTools(await this.client.listTools())
    return this
  }
  close() {
    this.client?.close()
    this.client = null
  }
  capabilities() {
    return Object.fromEntries(Object.entries(this.tools ?? {}).map(([k, t]) => [k, t.name]))
  }
  async callRole(role, args) {
    await this.connect()
    const t = this.tools[role]
    if (!t) throw Object.assign(new Error(`Krafie does not currently expose a ${role} tool.`), { code: 'UNSUPPORTED' })
    return jsonOf(await this.client.callTool(t.name, fitArgs(t, args)))
  }
  async keywordOpportunities(seed) {
    const at = new Date().toISOString()
    return findRows(await this.callRole('keywords', { keyword: seed, query: seed, seed })).map((o) => normalizeKeyword(o, at)).filter(Boolean)
  }
  async viralListings(seed) {
    const at = new Date().toISOString()
    return findRows(await this.callRole('viral', { keyword: seed, query: seed })).map((o) => normalizeListing(o, at)).filter(Boolean)
  }
  async estimate(kind, params) {
    return this.callRole('estimate', { tool: kind === 'video' ? this.tools.generateVideo?.name : this.tools.generateImage?.name, ...params })
  }
  async submit(kind, params, idempotencyKey) {
    const r = await this.callRole(kind === 'video' ? 'generateVideo' : kind === 'mockup' ? 'mockup' : 'generateImage', { ...params, idempotency_key: idempotencyKey })
    return { jobId: pick(r, ['job_id', 'jobId', 'id']) ?? null, status: pick(r, ['status']) ?? 'pending', outputUrl: pick(r, ['url', 'output_url', 'image_url', 'video_url']) ?? null }
  }
  async status(jobId) {
    const r = await this.callRole('jobStatus', { job_id: jobId, jobId })
    return { status: String(pick(r, ['status', 'state']) ?? 'pending').toLowerCase(), outputUrl: pick(r, ['url', 'output_url', 'result_url', 'image_url', 'video_url']) ?? findUrl(r), error: pick(r, ['error', 'message']) ?? null }
  }
  async download(url) {
    if (!/^https:\/\//.test(url)) throw new Error('Refusing non-HTTPS asset URL')
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    return { buffer: buf, mime: res.headers.get('content-type')?.split(';')[0] ?? 'application/octet-stream' }
  }
}

function findUrl(o, depth = 0) {
  if (depth > 4 || !o) return null
  if (typeof o === 'string') return /^https:\/\//.test(o) ? o : null
  if (typeof o === 'object') for (const v of Object.values(o)) {
    const u = findUrl(v, depth + 1)
    if (u) return u
  }
  return null
}

/** Keep only arguments the tool's input schema declares (when it declares any). */
export function fitArgs(tool, args) {
  const props = tool?.inputSchema?.properties
  if (!props) return args
  const out = {}
  for (const [k, v] of Object.entries(args)) if (k in props && v !== undefined) out[k] = v
  return out
}

/** Offline provider for the demo shop: fixed, labelled sample signals and placeholder images. */
export class DemoResearchProvider {
  constructor() {
    this.name = 'demo-research'
    this.isDemo = true
    this.jobs = new Map()
  }
  async connect() {
    return this
  }
  close() {}
  capabilities() {
    return { keywords: 'demo', viral: 'demo', generateImage: 'demo placeholder', estimate: 'demo', jobStatus: 'demo', mockup: 'demo placeholder' }
  }
  async keywordOpportunities() {
    const at = new Date().toISOString()
    const rows = [
      ['personalized candle', 'gifts', 82, 70, 75, 55], ['bridesmaid proposal gift', 'wedding', 78, 64, 80, 60],
      ['digital planner ipad', 'planners', 88, 85, 82, 72], ['budget planner printable', 'planners', 74, 72, 60, 58],
      ['wedding welcome sign template', 'wedding', 81, 60, 78, 40], ['teacher appreciation gift', 'gifts', 69, 66, 90, 63],
      ['fall candle', 'seasonal', 63, 80, 85, 82], ['christmas candle', 'seasonal', 79, 82, 95, 76],
      ['kids reward chart', 'printables', 66, 52, 55, 35], ['self care journal', 'printables', 71, 58, 62, 45],
      ['bookish candle', 'gifts', 85, 61, 88, 30], ['sage green wall art', 'decor', 64, 70, 50, 68],
      ['baby shower games', 'party', 72, 75, 58, 66], ['meal planner printable', 'planners', 58, 55, 45, 50],
    ]
    return rows.map(([keyword, theme, opportunity, demand, trend, competition]) => ({
      keyword, theme, opportunity, demand, trend, competition, est_sales: null, confidence: null, captured_at: at,
      samples: [{ url: null, title: `Sample listing for “${keyword}” (demo)`, price: null, est_sales: null, trend, category: theme, shop: null, captured_at: at }],
    }))
  }
  async viralListings() {
    return []
  }
  async estimate(kind) {
    return { credits: kind === 'video' ? 40 : 4, currency: 'credits', note: 'Demo estimate — no charge' }
  }
  async submit(kind, params) {
    if (kind === 'video') throw Object.assign(new Error('Video generation needs the live Krafie connection.'), { code: 'UNSUPPORTED' })
    const jobId = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    this.jobs.set(jobId, { kind, params, polls: 0 })
    return { jobId, status: 'pending', outputUrl: null }
  }
  async status(jobId) {
    const j = this.jobs.get(jobId)
    if (!j) return { status: 'failed', error: 'Demo job lost on restart — resubmit (demo jobs are free).' }
    j.polls++
    return j.polls >= 1 ? { status: 'completed', outputUrl: `demo://${jobId}` } : { status: 'pending' }
  }
  async download(url) {
    const seed = [...url].reduce((s, c) => s + c.charCodeAt(0), 0)
    const job = this.jobs.get(url.replace('demo://', ''))
    const hue = seed % 360
    return { buffer: makePng(1200, 1200, demoPainter(hue, job?.kind === 'mockup')), mime: 'image/png' }
  }
}

function demoPainter(hue, framed) {
  const [r1, g1, b1] = hsl(hue, 0.45, 0.82)
  const [r2, g2, b2] = hsl((hue + 40) % 360, 0.5, 0.55)
  return (x, y, w, h) => {
    if (framed && (x < 80 || y < 80 || x > w - 80 || y > h - 80)) return [245, 242, 236]
    const t = (x + y) / (w + h)
    const inBlob = (x - w / 2) ** 2 + (y - h / 2) ** 2 < (w / 4) ** 2
    return inBlob ? [r2, g2, b2] : [Math.round(r1 * (1 - t * 0.2)), Math.round(g1 * (1 - t * 0.2)), Math.round(b1 * (1 - t * 0.2))]
  }
}
function hsl(h, s, l) {
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

let override
let demo
export function setResearchProvider(p) {
  override = p
}
export function researchProviderFor(shop) {
  if (override) return override
  // One demo instance per process so its in-memory jobs survive between requests.
  if (shop?.is_demo) return (demo ??= new DemoResearchProvider())
  return new KrafieProvider()
}
