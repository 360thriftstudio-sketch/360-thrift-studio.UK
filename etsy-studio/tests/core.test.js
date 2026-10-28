import { test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { setup, demoShop } from './helpers.js'

const ctx = await setup()
const { db } = ctx
const { parseMoney, fromEtsyMoney } = await import('../src/lib/money.js')
const { phraseMatcher, tokens } = await import('../src/lib/text.js')
const { sanitizeReceipt, findPii } = await import('../src/lib/sanitize.js')
const { createPkce, buildAuthorizeUrl, stateMatches } = await import('../src/lib/oauth.js')
const { EtsyClient } = await import('../src/lib/etsy.js')
const { syncEtsy } = await import('../src/lib/etsy-sync.js')
const { compare30, windowMetrics } = await import('../src/lib/analytics.js')
const { parseCsv } = await import('../src/lib/research.js')

test('money parsing', () => {
  assert.equal(parseMoney('12.50'), 1250)
  assert.equal(parseMoney('$1,234.56'), 123456)
  assert.equal(parseMoney('1.234,56 €'), 123456)
  assert.equal(parseMoney('abc'), null)
  assert.deepEqual(fromEtsyMoney({ amount: 2450, divisor: 100, currency_code: 'GBP' }), { minor: 2450, currency: 'GBP' })
  assert.deepEqual(fromEtsyMoney({ amount: 300, divisor: 1, currency_code: 'JPY' }), { minor: 30000, currency: 'JPY' })
})

test('keyword matching uses whole words, not substrings', () => {
  const art = phraseMatcher('wall art')
  assert.equal(art('Party wall decor'), false)
  assert.equal(art('Botanical Wall Art Print'), true)
  assert.equal(phraseMatcher('candles')('Soy Candle'), true, 'plural folding')
  assert.equal(phraseMatcher('candle', { exclusions: ['holder'] })('candle holder'), false)
  assert.equal(phraseMatcher('mum gift', { synonyms: { mum: ['mom', 'mother'] } })('Gift for Mom'), true)
  assert.deepEqual(tokens('The Café & the Planners'), ['cafe', 'planner'])
})

test('receipt sanitiser keeps an allow-list only', () => {
  const r = sanitizeReceipt({
    receipt_id: 1, status: 'Paid', is_paid: true, created_timestamp: 1700000000,
    subtotal: { amount: 1000, divisor: 100, currency_code: 'USD' },
    buyer_email: 'x@example.com', buyer_user_id: 9, name: 'A Person', first_line: '1 St', city: 'C', zip: '1', country_iso: 'US',
    message_from_buyer: 'hi', gift_message: 'g', shipments: [{ tracking: 1 }], formatted_address: 'addr',
    transactions: [{ transaction_id: 5, listing_id: 7, quantity: 2, price: { amount: 500, divisor: 100 }, buyer_user_id: 9, variations: [{ formatted_value: 'Name' }], personalization: 'Name' }],
  })
  assert.deepEqual(findPii(r), [])
  assert.equal(r.transactions[0].quantity, 2)
  assert.equal(r.subtotal_minor, 1000)
  assert.ok(!JSON.stringify(r).includes('example.com'))
  assert.ok(!JSON.stringify(r).includes('A Person'))
})

test('OAuth PKCE S256, state check, no resource parameter', () => {
  const { verifier, challenge } = createPkce()
  assert.ok(verifier.length >= 43 && verifier.length <= 128)
  assert.equal(challenge, crypto.createHash('sha256').update(verifier).digest('base64url'))
  const u = new URL(buildAuthorizeUrl({ clientId: 'k', redirectUri: 'https://localhost:3003/oauth/callback', scopes: ['listings_r', 'shops_r'], state: 's', challenge }))
  assert.equal(u.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(u.searchParams.get('scope'), 'listings_r shops_r')
  assert.equal(u.searchParams.get('resource'), null)
  assert.equal(stateMatches('abc', 'abc'), true)
  assert.equal(stateMatches('abc', 'abd'), false)
  assert.equal(stateMatches('abc', null), false)
})

function mockFetch(handler) {
  const calls = []
  const f = async (url, init) => {
    calls.push({ url: String(url), init })
    const r = await handler(new URL(url), init, calls.length)
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 200, headers: r.headers ?? {} })
  }
  f.calls = calls
  return f
}
const client = (fetchImpl) => new EtsyClient({ fetchImpl, tokenProvider: async () => ({ access_token: '1.tok' }), config: { keystring: 'key', sharedSecret: 'sec', apiBase: 'https://api.test/v3' }, maxQps: 1000 })

test('pagination reads every page and sends the API key', async () => {
  const total = 230
  const f = mockFetch((u) => {
    const offset = Number(u.searchParams.get('offset'))
    const limit = Number(u.searchParams.get('limit'))
    const results = Array.from({ length: Math.max(0, Math.min(limit, total - offset)) }, (_, i) => ({ listing_id: offset + i }))
    return { body: { count: total, results } }
  })
  const rows = await client(f).listListings(1)
  assert.equal(rows.length, 230)
  assert.equal(new Set(rows.map((r) => r.listing_id)).size, 230)
  assert.equal(f.calls.length, 3)
  assert.equal(f.calls[0].init.headers['x-api-key'], 'key:sec')
  assert.equal(f.calls[0].init.headers.authorization, 'Bearer 1.tok')
})

test('reads retry on 429; writes never retry on 5xx', async () => {
  const f = mockFetch((_u, _i, n) => (n === 1 ? { status: 429, headers: { 'retry-after': '0' } } : { body: { user_id: 1, shop_id: 2 } }))
  assert.deepEqual(await client(f).getMe(), { user_id: 1, shop_id: 2 })
  assert.equal(f.calls.length, 2)
  const w = mockFetch(() => ({ status: 503, body: { error: 'down' } }))
  await assert.rejects(client(w).createDraftListing(1, { title: 't' }), /503/)
  assert.equal(w.calls.length, 1)
  const bad = mockFetch(() => ({ status: 400, body: { error: 'bad title' } }))
  await assert.rejects(client(bad).updateListing(1, 2, { title: 't' }), (e) => e.permanent === true)
})

test('rate-limit headers slow requests down', async () => {
  const f = mockFetch(() => ({ body: {}, headers: { 'x-limit-per-second': '2', 'x-remaining-today': '9000' } }))
  const c = client(f)
  await c.ping()
  assert.equal(c.minGapMs, 500)
  assert.equal(c.remainingToday, 9000)
})

const demo = await demoShop(db, ctx)

test('sync is idempotent and stores no buyer data', async () => {
  const count = () => db.prepare('SELECT COUNT(*) n, SUM(subtotal_minor) s FROM receipts_sanitized').get()
  const tx = () => db.prepare('SELECT COUNT(*) n FROM receipt_transactions').get().n
  const a = count()
  const ta = tx()
  await syncEtsy(db, demo.client, { isDemo: true })
  assert.deepEqual(count(), a)
  assert.equal(tx(), ta)
  const snap = fs.readdirSync(path.join(ctx.dir, 'raw')).find((f) => f.startsWith('etsy-'))
  const text = fs.readFileSync(path.join(ctx.dir, 'raw', snap), 'utf8')
  for (const needle of ['buyer@example.invalid', 'Demo Buyer', '1 Example Street', 'demo message', 'Demo Name', 'access_token']) assert.ok(!text.includes(needle), needle)
  assert.deepEqual(findPii(JSON.parse(text).receipts), [])
})

test('a failed sync keeps the last good data', async () => {
  const before = db.prepare('SELECT COUNT(*) n FROM receipts_sanitized').get().n
  demo.client.failNext.listReceipts = 'boom'
  await assert.rejects(syncEtsy(db, demo.client, { isDemo: true }), /boom/)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM receipts_sanitized').get().n, before)
  assert.equal(db.prepare("SELECT status FROM source_syncs ORDER BY id DESC LIMIT 1").get().status, 'failed')
  assert.equal(db.prepare("SELECT value FROM settings WHERE key='lock:etsy-sync'").get().value, 'null', 'lock released')
})

test('30-day windows split cleanly and exclude cancelled orders', () => {
  const now = Date.now()
  const c = compare30(db, demo.shop.shop_id, now)
  const all = windowMetrics(db, demo.shop.shop_id, now - 60 * 86400_000, now)
  assert.equal(c.current.orders + c.previous.orders, all.orders)
  assert.equal(c.current.revenue_minor + c.previous.revenue_minor, all.revenue_minor)
  const cancelled = db.prepare("SELECT COUNT(*) n FROM receipts_sanitized WHERE status='canceled' AND created_at >= ?").get(new Date(now - 60 * 86400_000).toISOString()).n
  const raw = db.prepare('SELECT COUNT(*) n FROM receipts_sanitized WHERE created_at >= ? AND created_at < ?').get(new Date(now - 60 * 86400_000).toISOString(), new Date(now).toISOString()).n
  assert.equal(all.orders, raw - cancelled)
})

test('CSV parser handles quotes, commas and CRLF', () => {
  assert.deepEqual(parseCsv('a,b\r\n"x, y","say ""hi"""\r\n'), [['a', 'b'], ['x, y', 'say "hi"']])
})
