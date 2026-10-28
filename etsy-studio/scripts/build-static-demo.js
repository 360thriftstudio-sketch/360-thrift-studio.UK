// Builds output/seller-studio-demo.html: a single, read-only page of the demo shop that needs no server.
// It runs the real app in-process on the fictional shop, walks a few drafts through the pipeline,
// then saves every screen's API response into the page.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'

process.env.STUDIO_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-static-'))
for (const k of ['ETSY_KEYSTRING', 'ETSY_SHARED_SECRET', 'ETSY_ENABLE_WRITES', 'KREATORIUM_MOCKUP_URL']) delete process.env[k]

const { ROOT, getConfig } = await import('../src/lib/config.js')
await import('./demo-seed.js')
const { getDb } = await import('../src/lib/db.js')
const { createApp } = await import('../src/lib/app.js')

const server = http.createServer(createApp(getDb(), { publicDemo: true }))
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}`
let csrf = ''
async function call(method, p, body, headers = {}) {
  const res = await fetch(base + p, {
    method,
    headers: { 'x-studio-token': csrf, ...(body && !Buffer.isBuffer(body) ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`${method} ${p}: ${json.error}`)
  return json
}
csrf = (await call('GET', '/api/session')).csrf

async function generate(kind, extra) {
  const job = await call('POST', '/api/creative/estimate', { kind, ...extra })
  await call('POST', `/api/creative/jobs/${job.id}/confirm`, { confirm: true })
  const done = await call('POST', `/api/creative/jobs/${job.id}/poll`)
  return done.output_asset_id
}

async function buildDraft(brief, fields, { file, push, publish } = {}) {
  const { draft } = await call('POST', '/api/briefs', brief)
  const design = await generate('image', { prompt: `${brief.style} ${brief.product_type} artwork`, aspect_ratio: '1:1' })
  const mockup = await generate('mockup', { asset_id: design, template_id: 'desk-flatlay' })
  const copy = await call('POST', `/api/drafts/${draft.id}/generate`)
  await call('PATCH', `/api/drafts/${draft.id}`, { fields: { title: copy.recommended.title, tags: copy.recommended.tags, description: copy.recommended.description, ...fields } })
  await call('POST', `/api/drafts/${draft.id}/assets`, { asset_id: mockup, role: 'image', alt_text: copy.recommended.title })
  await call('POST', `/api/drafts/${draft.id}/assets`, { asset_id: design, role: 'image', alt_text: `${brief.product_type} design` })
  if (file) {
    const a = await call('POST', '/api/assets', Buffer.from('%PDF-1.4\n% demo printable\n1 0 obj\n<<>>\nendobj\n%%EOF'), { 'x-filename': encodeURIComponent(file) })
    await call('POST', `/api/drafts/${draft.id}/assets`, { asset_id: a.id, role: 'file' })
  }
  if (push) await call('POST', `/api/drafts/${draft.id}/push`)
  if (publish) await call('POST', `/api/drafts/${draft.id}/publish`, { confirm_text: 'PUBLISH', acknowledge_fees: true })
  return draft.id
}

// Example drafts in different states.
await buildDraft(
  { keyword: 'budget planner printable', product_kind: 'digital', product_type: 'budget planner', audience: 'students', occasion: 'new year', style: 'minimalist' },
  { price: 5.5, quantity: 999, taxonomy_id: 2078 },
  { file: 'budget-planner.pdf', push: true, publish: true },
)
await buildDraft(
  { keyword: 'bookish candle', product_kind: 'physical', product_type: 'soy candle', audience: 'book lovers', occasion: 'birthday', style: 'vintage library' },
  { price: 26, quantity: 15, taxonomy_id: 1633, shipping_profile_id: 7001, readiness_state_id: 9002, return_policy_id: 8001, materials: ['soy wax', 'cotton wick'] },
  { push: true },
)
await buildDraft({ keyword: 'teacher appreciation gift', product_kind: 'physical', product_type: 'candle', audience: 'teachers', occasion: 'end of year', style: 'bright' }, { price: 22 })

// One staged and one applied SEO change, so Optimize and Performance show history.
const opt = (await call('GET', '/api/optimize')).rows
for (const row of opt.filter((r) => !r.hero).slice(0, 2)) {
  const detail = await call('GET', `/api/optimize/${row.listing_id}`)
  const rec = detail.recommendations.find((r) => r.automatable && r.status === 'suggested')
  if (!rec) continue
  await call('POST', `/api/recommendations/${rec.id}/status`, { status: 'staged' })
  if (row === opt.filter((r) => !r.hero)[0]) await call('POST', `/api/listings/${row.listing_id}/apply`, { recommendation_ids: [rec.id], confirm: true })
}

// Snapshot every GET the screens use.
const data = {}
const get = async (p) => (data[p] = await call('GET', p))
for (const p of ['/api/session', '/api/home', '/api/optimize', '/api/research', '/api/performance', '/api/drafts', '/api/refs', '/api/creative', '/api/assets', '/api/briefs', '/api/research/insights-template']) await get(p)
data['/api/taxonomy'] = await call('GET', '/api/taxonomy?q=')
for (const r of data['/api/optimize'].rows) await get(`/api/optimize/${r.listing_id}`)
for (const r of data['/api/research'].rows) await get(`/api/research/keyword/${encodeURIComponent(r.keyword)}`)
for (const d of data['/api/drafts'].drafts) await get(`/api/drafts/${d.id}`)
data['/api/session'].csrf = ''
server.close()

const assets = {}
const { getAsset, readAsset } = await import('../src/lib/assets.js')
for (const a of data['/api/assets'].filter((x) => x.kind === 'image')) {
  assets[a.id] = `data:${a.mime};base64,${readAsset(getAsset(getDb(), a.id)).toString('base64')}`
}

const dash = getConfig().paths.dashboard
const css = fs.readFileSync(path.join(dash, 'styles.css'), 'utf8')
const js = fs.readFileSync(path.join(dash, 'app.js'), 'utf8')
const body = fs.readFileSync(path.join(dash, 'index.html'), 'utf8').match(/<body>([\s\S]*)<\/body>/)[1]
const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c')
const html = `<title>Seller Studio</title>
<meta name="robots" content="noindex" />
<style>
${css}
</style>
${body.trim()}
<script>window.__STATIC_DEMO__ = ${safeJson({ data, assets, built_at: new Date().toISOString() })}</script>
<script type="module">
${js.replace(/<\/script/gi, '<\\/script')}
</script>
`
const out = path.join(ROOT, 'output', 'seller-studio-demo.html')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, html)
fs.rmSync(process.env.STUDIO_DATA_DIR, { recursive: true, force: true })
console.log(`Wrote ${path.relative(process.cwd(), out)} (${Math.round(html.length / 1024)} KB, ${Object.keys(data).length} snapshots, ${Object.keys(assets).length} images)`)
