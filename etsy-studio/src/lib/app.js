// Dashboard request handler. Exported separately from the listener so tests can drive it.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { ETSY_DISCLOSURE, ETSY_LIMITS, WHEN_MADE, WHO_MADE, getConfig } from './config.js'
import { audit, currentShop, getSetting, newId, now, parse } from './db.js'
import { securityHeaders, sendJson, readJson, readBody } from './http.js'
import { homeView, optimizeList, optimizeDetail, researchView, performanceView, sourceStatus } from './views.js'
import { recRow, runAudit } from './seo.js'
import { syncEtsy } from './etsy-sync.js'
import { syncResearch, importInsights, importWatchedFolder, INSIGHTS_TEMPLATE, keywordGaps, latestKeywords, storeOpportunities } from './research.js'
import { etsyClientFor } from './clients.js'
import { researchProviderFor } from './krafie.js'
import { saveAsset, getAsset, readAsset } from './assets.js'
import { estimateJob, confirmJob, pollJob, listJobs, MOCKUP_TEMPLATES, KreatoriumMockupProvider } from './creative.js'
import {
  createDraft, getDraft, listDrafts, updateDraftFields, attachAsset, detachAsset, generateListing, pushDraft, publishDraft, PUBLISH_PHRASE, writesAllowed,
} from './drafts.js'
import { applyRecommendations } from './listing-writes.js'
import { readToken } from './oauth.js'
import { vault } from './vault.js'

const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/methodology.html': ['methodology.html', 'text/html; charset=utf-8'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml'],
}

const err = (status, message) => Object.assign(new Error(message), { status })

export function createApp(db, { port = getConfig().dashboard.port, publicDemo = getConfig().publicDemo } = {}) {
  const csrf = crypto.randomBytes(24).toString('base64url')
  const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`])
  const routes = []
  const on = (method, pattern, fn) => routes.push({ method, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), fn })
  const shopOr404 = () => {
    const s = currentShop(db)
    if (!s) throw err(404, 'No shop yet. Run `npm run demo:seed` or connect Etsy with `npm run auth` then `npm run sync`.')
    return s
  }

  // ---------- session / status ----------
  on('GET', '/api/session', () => {
    const shop = currentShop(db)
    const token = shop && !shop.is_demo ? safe(() => readToken()) : null
    return {
      csrf,
      shop: shop ? { shop_id: shop.shop_id, name: shop.name, currency: shop.currency, is_demo: shop.is_demo, url: shop.url } : null,
      etsy: { connected: !!token, scopes: token?.scopes ?? [], writes: shop ? writesAllowed(shop) : { ok: false } },
      vault: vault.available(),
      disclosure: ETSY_DISCLOSURE,
      limits: ETSY_LIMITS,
      enums: { who_made: WHO_MADE, when_made: WHEN_MADE },
      publish_phrase: PUBLISH_PHRASE,
      public_demo: publicDemo,
      sources: shop ? sourceStatus(db, shop) : null,
      seo_audit: getSetting(db, 'seo_audit'),
    }
  })
  on('GET', '/api/home', () => homeView(db, shopOr404()))

  // ---------- optimize ----------
  on('GET', '/api/optimize', () => ({ rows: optimizeList(db, shopOr404()) }))
  on('GET', '/api/optimize/:id', ({ params }) => optimizeDetail(db, shopOr404(), params.id) ?? Promise.reject(err(404, 'Listing not found')))
  on('POST', '/api/recommendations/:id/status', async ({ params, body }) => {
    const shop = shopOr404()
    if (!['suggested', 'staged', 'dismissed'].includes(body.status)) throw err(400, 'status must be suggested, staged or dismissed')
    const r = db.prepare("UPDATE seo_recommendations SET status=?, updated_at=? WHERE id=? AND shop_id=? AND status != 'applied'").run(body.status, now(), params.id, shop.shop_id)
    if (!r.changes) throw err(404, 'Recommendation not found or already applied')
    audit(db, `recommendation.${body.status}`, { shopId: shop.shop_id, target: params.id })
    return recRow(db.prepare('SELECT * FROM seo_recommendations WHERE id=?').get(params.id))
  })
  on('POST', '/api/listings/:id/apply', async ({ params, body }) => {
    const shop = shopOr404()
    return applyRecommendations(db, shop, etsyClientFor(shop), params.id, body.recommendation_ids ?? [], { confirm: body.confirm === true, acknowledgeHero: body.acknowledge_hero === true })
  })
  on('POST', '/api/audit', () => {
    const shop = shopOr404()
    runAudit(db, shop, { research: latestKeywords(db, shop.shop_id).map((k) => k.keyword) })
    return { ok: true, at: now() }
  })

  // ---------- research ----------
  on('GET', '/api/research', ({ query }) => researchView(db, shopOr404(), query))
  on('GET', '/api/research/keyword/:kw', ({ params }) => {
    const kw = decodeURIComponent(params.kw)
    const row = keywordGaps(db, shopOr404()).find((r) => r.keyword === kw)
    if (!row) throw err(404, 'Keyword not found')
    return row
  })
  on('POST', '/api/research/refresh', async () => {
    const shop = shopOr404()
    const counts = await syncResearch(db, shop, researchProviderFor(shop))
    importWatchedFolder(db, shop)
    storeOpportunities(db, shop, keywordGaps(db, shop))
    runAudit(db, shop, { research: latestKeywords(db, shop.shop_id).map((k) => k.keyword) })
    return counts
  })
  on('GET', '/api/research/insights-template', () => ({ csv: INSIGHTS_TEMPLATE }))
  on('POST', '/api/research/insights', async ({ body }) => {
    const shop = shopOr404()
    if (typeof body.csv !== 'string' || body.csv.length > 500_000) throw err(400, 'Paste CSV text (max 500 KB).')
    const r = importInsights(db, shop, body.csv, { filename: body.filename ?? `manual-${now().slice(0, 10)}.csv` })
    storeOpportunities(db, shop, keywordGaps(db, shop))
    return r
  })

  // ---------- etsy refresh ----------
  on('POST', '/api/etsy/refresh', async () => {
    const shop = shopOr404()
    const r = await syncEtsy(db, etsyClientFor(shop), { isDemo: shop.is_demo })
    runAudit(db, currentShop(db), { research: latestKeywords(db, shop.shop_id).map((k) => k.keyword) })
    return r
  })

  // ---------- performance ----------
  on('GET', '/api/performance', () => performanceView(db, shopOr404()))

  // ---------- reference data ----------
  on('GET', '/api/refs', () => {
    const shop = shopOr404()
    const refs = {}
    for (const r of db.prepare('SELECT kind, ref_id, name FROM shop_refs WHERE shop_id=? ORDER BY name').all(shop.shop_id)) (refs[r.kind] ??= []).push({ id: r.ref_id, name: r.name })
    return refs
  })
  on('GET', '/api/taxonomy', ({ query }) => {
    const q = `%${String(query.q ?? '').slice(0, 60)}%`
    return db.prepare('SELECT id, path, is_leaf FROM taxonomy_nodes WHERE path LIKE ? ORDER BY is_leaf DESC, length(path) LIMIT 30').all(q)
  })

  // ---------- briefs ----------
  on('GET', '/api/briefs', () => db.prepare('SELECT * FROM product_briefs WHERE shop_id=? ORDER BY created_at DESC LIMIT 50').all(shopOr404().shop_id))
  on('POST', '/api/briefs', ({ body }) => {
    const shop = shopOr404()
    const id = newId('brf')
    const s = (v, n = 120) => String(v ?? '').trim().slice(0, n)
    const kind = body.product_kind === 'physical' ? 'physical' : 'digital'
    db.prepare('INSERT INTO product_briefs (id, shop_id, keyword, product_kind, product_type, audience, occasion, style, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, shop.shop_id, s(body.keyword), kind, s(body.product_type), s(body.audience), s(body.occasion), s(body.style), s(body.notes, 1000), now(),
    )
    const draft = createDraft(db, shop, { kind: kind === 'physical' ? 'physical' : 'download', brief_id: id })
    audit(db, 'brief.create', { shopId: shop.shop_id, target: id, detail: { keyword: s(body.keyword) } })
    return { brief: db.prepare('SELECT * FROM product_briefs WHERE id=?').get(id), draft }
  })

  // ---------- drafts ----------
  on('GET', '/api/drafts', () => ({ drafts: listDrafts(db, shopOr404().shop_id).map(publicDraft) }))
  on('POST', '/api/drafts', ({ body }) => publicDraft(createDraft(db, shopOr404(), { kind: body.kind })))
  on('GET', '/api/drafts/:id', ({ params }) => {
    const d = getDraft(db, params.id)
    if (!d || d.shop_id !== shopOr404().shop_id) throw err(404, 'Draft not found')
    const brief = d.brief_id ? db.prepare('SELECT * FROM product_briefs WHERE id=?').get(d.brief_id) : null
    return { ...publicDraft(d), brief, jobs: db.prepare("SELECT stage, status, error, finished_at FROM publish_jobs WHERE draft_id=? ORDER BY id DESC LIMIT 20").all(d.id) }
  })
  on('PATCH', '/api/drafts/:id', ({ params, body }) => publicDraft(updateDraftFields(db, ownDraft(params.id).id, body.fields ?? {})))
  on('POST', '/api/drafts/:id/generate', ({ params }) => {
    const d = ownDraft(params.id)
    const brief = d.brief_id ? db.prepare('SELECT * FROM product_briefs WHERE id=?').get(d.brief_id) : { keyword: d.fields.title, product_kind: d.fields.type === 'physical' ? 'physical' : 'digital' }
    return generateListing(brief, { researchKeywords: latestKeywords(db, d.shop_id).map((k) => k.keyword) })
  })
  on('POST', '/api/drafts/:id/assets', ({ params, body }) => publicDraft(attachAsset(db, ownDraft(params.id).id, { asset_id: body.asset_id, role: body.role, alt_text: body.alt_text })))
  on('POST', '/api/drafts/:id/assets/remove', ({ params, body }) => publicDraft(detachAsset(db, ownDraft(params.id).id, body.asset_id, body.role)))
  on('POST', '/api/drafts/:id/push', async ({ params }) => {
    const shop = shopOr404()
    return publicDraft(await pushDraft(db, shop, etsyClientFor(shop), ownDraft(params.id).id))
  })
  on('POST', '/api/drafts/:id/publish', async ({ params, body }) => {
    const shop = shopOr404()
    return publicDraft(await publishDraft(db, shop, etsyClientFor(shop), ownDraft(params.id).id, { confirmText: body.confirm_text, acknowledgeFees: body.acknowledge_fees === true }))
  })

  // ---------- assets ----------
  on('GET', '/api/assets', () => db.prepare('SELECT id, kind, mime, size, filename, width, height, source, created_at FROM assets WHERE shop_id=? ORDER BY created_at DESC LIMIT 200').all(shopOr404().shop_id))
  on('POST', '/api/assets', async ({ req }) => {
    const shop = shopOr404()
    // The public demo accepts small files only; everything is wiped when the demo restarts.
    const buf = await readBody(req, publicDemo ? 3 * 1024 * 1024 : ETSY_LIMITS.videoMaxBytes + 1024)
    const name = decodeURIComponent(String(req.headers['x-filename'] ?? 'upload'))
    const a = saveAsset(db, shop, buf, { filename: name, source: 'upload' })
    return { id: a.id, kind: a.kind, mime: a.mime, size: a.size, filename: a.filename, width: a.width, height: a.height }
  })

  // ---------- creative ----------
  const creativeProvider = (shop, kind) => {
    if (kind !== 'mockup' || shop.is_demo) return researchProviderFor(shop)
    return getConfig().kreatorium.mockupUrl ? new KreatoriumMockupProvider() : researchProviderFor(shop)
  }
  on('GET', '/api/creative', () => {
    const shop = shopOr404()
    return { jobs: listJobs(db, shop.shop_id), templates: MOCKUP_TEMPLATES, history_note: 'Shows Krafie media generated through this app.', provider: shop.is_demo ? 'demo placeholders' : 'krafie' }
  })
  on('POST', '/api/creative/estimate', async ({ body }) => {
    const shop = shopOr404()
    const kind = ['image', 'video', 'mockup'].includes(body.kind) ? body.kind : 'image'
    const params = {
      prompt: body.prompt ? String(body.prompt).slice(0, 1000) : undefined,
      aspect_ratio: body.aspect_ratio,
      duration: body.duration ? Number(body.duration) : undefined,
      model: body.model,
      template_id: body.template_id,
      asset_id: body.asset_id,
    }
    if (kind === 'mockup' && !getAsset(db, body.asset_id)) throw err(400, 'Choose a design to place on the mockup.')
    const p = creativeProvider(shop, kind)
    try {
      return await estimateJob(db, shop, p, { kind, params })
    } finally {
      p.close?.()
    }
  })
  on('POST', '/api/creative/jobs/:id/confirm', async ({ params, body }) => {
    const shop = shopOr404()
    if (body.confirm !== true) throw err(400, 'Confirm the estimate first.')
    const job = db.prepare('SELECT kind FROM creative_jobs WHERE id=?').get(params.id)
    const p = creativeProvider(shop, job?.kind)
    try {
      return await confirmJob(db, shop, p, params.id)
    } finally {
      if (!p.isDemo) p.close?.()
    }
  })
  on('POST', '/api/creative/jobs/:id/poll', async ({ params }) => {
    const shop = shopOr404()
    const job = db.prepare('SELECT kind FROM creative_jobs WHERE id=?').get(params.id)
    const p = creativeProvider(shop, job?.kind)
    try {
      return await pollJob(db, shop, p, params.id)
    } finally {
      if (!p.isDemo) p.close?.()
    }
  })

  // ---------- audit log ----------
  on('GET', '/api/audit-log', () => db.prepare('SELECT at, actor, action, target, detail_json FROM audit_log WHERE shop_id=? OR shop_id IS NULL ORDER BY id DESC LIMIT 100').all(shopOr404().shop_id).map((r) => ({ ...r, detail: parse(r.detail_json) })))

  function ownDraft(id) {
    const d = getDraft(db, id)
    if (!d || d.shop_id !== shopOr404().shop_id) throw err(404, 'Draft not found')
    return d
  }

  return async function handle(req, res) {
    securityHeaders(res)
    try {
      // DNS-rebinding guard: only our own loopback host names. A public demo answers on its own domain.
      if (publicDemo) {
        allowedHosts.add(String(req.headers.host ?? ''))
        res.setHeader('X-Robots-Tag', 'noindex, nofollow')
        res.setHeader('Strict-Transport-Security', 'max-age=31536000')
      } else if (!allowedHosts.has(String(req.headers.host ?? ''))) throw err(421, 'Unexpected Host header')
      const url = new URL(req.url, `http://${req.headers.host}`)

      if (req.method === 'GET' && STATIC[url.pathname]) {
        const [file, type] = STATIC[url.pathname]
        const p = path.join(getConfig().paths.dashboard, file)
        if (!fs.existsSync(p)) throw err(404, 'Not found')
        res.writeHead(200, { 'content-type': type })
        return res.end(fs.readFileSync(p))
      }
      const fileMatch = url.pathname.match(/^\/api\/assets\/(ast_[\w-]+)\/file$/)
      if (req.method === 'GET' && fileMatch) {
        const a = getAsset(db, fileMatch[1])
        if (!a || a.shop_id !== shopOr404().shop_id) throw err(404, 'Not found')
        const inline = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'].includes(a.mime)
        res.writeHead(200, {
          'content-type': inline ? a.mime : 'application/octet-stream',
          'content-disposition': `${inline ? 'inline' : 'attachment'}; filename="${a.filename.replace(/"/g, '')}"`,
          'cache-control': 'private, max-age=300',
        })
        return res.end(readAsset(a))
      }

      if (!url.pathname.startsWith('/api/')) throw err(404, 'Not found')
      if (req.method !== 'GET') {
        const origin = req.headers.origin
        if (origin && origin.replace(/^https?:\/\//, '') !== String(req.headers.host ?? '')) throw err(403, 'Cross-origin request refused')
        if (publicDemo && currentShop(db) && !currentShop(db).is_demo) throw err(403, 'Public demo serves the demo shop only.')
        const token = String(req.headers['x-studio-token'] ?? '')
        if (token.length !== csrf.length || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(csrf))) throw err(403, 'Missing or invalid session token — reload the page.')
      }
      for (const r of routes) {
        if (r.method !== req.method) continue
        const m = url.pathname.match(r.re)
        if (!m) continue
        const isUpload = r.method === 'POST' && url.pathname === '/api/assets'
        const body = r.method === 'GET' || isUpload ? {} : await readJson(req)
        const out = await r.fn({ req, params: m.groups ?? {}, query: Object.fromEntries(url.searchParams), body })
        return sendJson(res, 200, out ?? { ok: true })
      }
      throw err(404, 'Not found')
    } catch (e) {
      const status = e.status && e.status >= 400 && e.status < 600 ? e.status : e.code === 'LOCKED' ? 409 : e.code === 'NOT_CONNECTED' ? 401 : 500
      if (status >= 500) console.error(`${req.method} ${req.url} → ${e.message}`)
      sendJson(res, status, { error: e.message, validation: e.validation })
    }
  }
}

function safe(fn) {
  try {
    return fn()
  } catch {
    return null
  }
}

function publicDraft(d) {
  if (!d) return d
  return {
    id: d.id,
    kind: d.kind,
    status: d.status,
    brief_id: d.brief_id,
    fields: d.fields,
    etsy_listing_id: d.etsy_listing_id,
    stages: d.stages,
    last_error: d.last_error,
    readback: d.readback,
    validation: d.validation,
    created_at: d.created_at,
    updated_at: d.updated_at,
    published_at: d.published_at,
    assets: d.assets.map((a) => ({ asset_id: a.asset_id, role: a.role, rank: a.rank, alt_text: a.alt_text, etsy_ref: a.etsy_ref, upload_error: a.upload_error, filename: a.asset?.filename, mime: a.asset?.mime, size: a.asset?.size, width: a.asset?.width, height: a.asset?.height })),
  }
}

