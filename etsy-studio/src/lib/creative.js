// Creative jobs (image, mockup, video). Paid generation is two-step: estimate, then explicit confirm.
// Each job is submitted at most once: the row is written before the call, and a job whose submission
// outcome is unknown is never resubmitted automatically.
import { getConfig } from './config.js'
import { audit, json, newId, now, parse } from './db.js'
import { saveAsset, getAsset, readAsset } from './assets.js'
import { vault } from './vault.js'

const BLOCKED_TERMS = /\b(disney|marvel|pixar|pok[eé]mon|nintendo|harry potter|hogwarts|star wars|nfl|nba|taylor swift|barbie|hello kitty|nike|adidas|gucci|louis vuitton|chanel|sanrio|bluey|stanley cup)\b/i

export function promptProblem(prompt) {
  if (!prompt || String(prompt).trim().length < 3) return 'Describe the design.'
  const m = String(prompt).match(BLOCKED_TERMS)
  if (m) return `“${m[0]}” is a brand, character or celebrity. Generate original artwork only.`
  return null
}

export async function estimateJob(db, shop, provider, { kind, params }) {
  const problem = kind !== 'mockup' ? promptProblem(params?.prompt) : null
  if (problem) throw Object.assign(new Error(problem), { status: 400 })
  let estimate
  try {
    estimate = await provider.estimate(kind, params)
  } catch (e) {
    estimate = { unavailable: true, note: `Cost estimate unavailable: ${e.message}` }
  }
  const id = newId('job')
  db.prepare(
    `INSERT INTO creative_jobs (id, shop_id, provider, tool, kind, params_json, idempotency_key, cost_estimate_json, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'estimated', ?, ?)`,
  ).run(id, shop.shop_id, provider.name, kind, kind, json(params), newId('idem'), json(estimate), now(), now())
  return getJob(db, id)
}

/** Submit after the operator confirmed the estimate. Calling twice is a no-op. */
export async function confirmJob(db, shop, provider, jobId) {
  const job = getJob(db, jobId)
  if (!job || job.shop_id !== shop.shop_id) throw Object.assign(new Error('Job not found'), { status: 404 })
  if (job.status !== 'estimated') return job // already submitted (or unknown) — never resubmit
  const claimed = db.prepare("UPDATE creative_jobs SET status='submitting', updated_at=? WHERE id=? AND status='estimated'").run(now(), jobId)
  if (!claimed.changes) return getJob(db, jobId)
  try {
    const params = { ...job.params }
    if (job.kind === 'mockup' && params.asset_id) {
      const a = getAsset(db, params.asset_id)
      params.design_base64 = a ? readAsset(a).toString('base64') : undefined
      params.design_mime = a?.mime
      delete params.asset_id
    }
    const r = await provider.submit(job.kind, params, job.idempotency_key)
    db.prepare("UPDATE creative_jobs SET status='pending', provider_job_id=?, next_poll_at=?, updated_at=? WHERE id=?").run(r.jobId, now(), now(), jobId)
    audit(db, 'creative.submit', { shopId: shop.shop_id, target: jobId, detail: { kind: job.kind, provider: provider.name } })
    if (r.outputUrl && !r.jobId) await finishJob(db, shop, provider, jobId, r.outputUrl)
  } catch (e) {
    // A provider error response means it was not accepted; mark failed. A dropped connection is "unknown".
    const status = e.code === 'UNSUPPORTED' || /4\d\d|invalid|unsupported|insufficient/i.test(e.message) ? 'failed' : 'unknown'
    db.prepare('UPDATE creative_jobs SET status=?, error=?, updated_at=? WHERE id=?').run(status, e.message.slice(0, 400), now(), jobId)
  }
  return getJob(db, jobId)
}

export async function pollJob(db, shop, provider, jobId) {
  const job = getJob(db, jobId)
  if (!job) throw Object.assign(new Error('Job not found'), { status: 404 })
  if (job.status !== 'pending' || !job.provider_job_id) return job
  if (job.next_poll_at && Date.parse(job.next_poll_at) > Date.now()) return job
  const attempts = job.attempts + 1
  try {
    const s = await provider.status(job.provider_job_id)
    if (/complete|succeed|done|finished/.test(s.status) && s.outputUrl) return finishJob(db, shop, provider, jobId, s.outputUrl)
    if (/fail|error|cancel/.test(s.status)) {
      db.prepare("UPDATE creative_jobs SET status='failed', error=?, attempts=?, updated_at=? WHERE id=?").run(String(s.error ?? s.status).slice(0, 400), attempts, now(), jobId)
      return getJob(db, jobId)
    }
  } catch (e) {
    db.prepare('UPDATE creative_jobs SET error=?, updated_at=? WHERE id=?').run(`Status check failed: ${e.message}`.slice(0, 400), now(), jobId)
  }
  // Back off: 5s, 10s, 20s … capped at 2 minutes.
  const wait = Math.min(120_000, 5000 * 2 ** Math.min(attempts - 1, 5))
  db.prepare('UPDATE creative_jobs SET attempts=?, next_poll_at=?, updated_at=? WHERE id=?').run(attempts, new Date(Date.now() + wait).toISOString(), now(), jobId)
  return getJob(db, jobId)
}

async function finishJob(db, shop, provider, jobId, url) {
  const job = getJob(db, jobId)
  const { buffer } = await provider.download(url)
  const asset = saveAsset(db, shop, buffer, {
    filename: `${job.kind}-${jobId}.${job.kind === 'video' ? 'mp4' : 'png'}`,
    source: provider.isDemo ? `${job.kind} (demo placeholder)` : `krafie ${job.kind}`,
    meta: { provider: provider.name, job_id: jobId, provider_job_id: job.provider_job_id, prompt: job.params?.prompt ?? null, template: job.params?.template_id ?? null, input_asset: job.params?.asset_id ?? null, estimate: job.cost_estimate },
  })
  db.prepare("UPDATE creative_jobs SET status='completed', output_asset_id=?, error=NULL, updated_at=? WHERE id=?").run(asset.id, now(), jobId)
  audit(db, 'creative.complete', { shopId: shop.shop_id, target: jobId, detail: { asset: asset.id } })
  return getJob(db, jobId)
}

export function getJob(db, id) {
  const r = db.prepare('SELECT * FROM creative_jobs WHERE id = ?').get(id)
  return r ? { ...r, params: parse(r.params_json, {}), cost_estimate: parse(r.cost_estimate_json) } : null
}

export function listJobs(db, shopId) {
  return db.prepare('SELECT * FROM creative_jobs WHERE shop_id = ? ORDER BY created_at DESC LIMIT 100').all(shopId).map((r) => ({ ...r, params: parse(r.params_json, {}), cost_estimate: parse(r.cost_estimate_json) }))
}

/**
 * Kreatorium mockup service adapter (server-side). Used when Krafie MCP has no mockup tool.
 * Token comes from the OS vault entry "kreatorium" — never from the browser.
 */
export class KreatoriumMockupProvider {
  constructor(url = getConfig().kreatorium.mockupUrl) {
    this.url = url
    this.name = 'kreatorium'
    this.isDemo = false
    this.results = new Map()
  }
  async connect() {
    if (!this.url) throw Object.assign(new Error('Set KREATORIUM_MOCKUP_URL to use the mockup service.'), { code: 'UNSUPPORTED' })
    return this
  }
  close() {}
  async estimate() {
    return { unavailable: true, note: 'Charged by Krafie tokens per mockup; see your Krafie balance.' }
  }
  async submit(_kind, params) {
    await this.connect()
    const token = vault.get('kreatorium')
    if (!token) throw Object.assign(new Error('Store the Kreatorium token: node scripts/set-secret.js kreatorium'), { code: 'UNSUPPORTED' })
    if (!/^https:\/\//.test(this.url)) throw new Error('Mockup service URL must be HTTPS')
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ template_id: params.template_id, design: { data: params.design_base64, mime: params.design_mime } }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`Mockup service ${res.status}: ${body.error ?? 'error'}`)
    const url = body.url ?? body.image_url ?? body.output_url
    return { jobId: body.job_id ?? null, status: url ? 'completed' : 'pending', outputUrl: url ?? null }
  }
  async status() {
    return { status: 'pending' }
  }
  async download(url) {
    if (!/^https:\/\//.test(url)) throw new Error('Refusing non-HTTPS asset URL')
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)
    return { buffer: Buffer.from(await res.arrayBuffer()), mime: res.headers.get('content-type') }
  }
}

export const MOCKUP_TEMPLATES = [
  { id: 'frame-oak-portrait', label: 'Oak frame, portrait', for: 'prints' },
  { id: 'frame-white-landscape', label: 'White frame, landscape', for: 'prints' },
  { id: 'tablet-planner', label: 'Tablet with planner page', for: 'planners' },
  { id: 'desk-flatlay', label: 'Desk flat-lay', for: 'printables' },
  { id: 'jar-label', label: 'Candle jar label', for: 'candles' },
  { id: 'tshirt-front', label: 'T-shirt front', for: 'apparel' },
]
