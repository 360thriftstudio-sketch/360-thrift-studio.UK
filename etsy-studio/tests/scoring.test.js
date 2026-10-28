import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setup, demoShop } from './helpers.js'

const ctx = await setup()
const { db } = ctx
const { shop } = await demoShop(db, ctx)
const { auditListing, proposeTitle, proposeTags, runAudit } = await import('../src/lib/seo.js')
const { keywordGaps, importInsights, syncResearch, WEIGHTS } = await import('../src/lib/research.js')
const { DemoResearchProvider } = await import('../src/lib/krafie.js')

test('title proposal removes repeats and respects limits', () => {
  const t = proposeTitle('Lavender Soy Candle 8oz Hand Poured Natural Wax Candle Relaxing Gift Candle Lavender Candle')
  assert.equal(t.match(/candle/gi).length, 1)
  assert.ok(t.split(/\s+/).length <= 15)
  assert.equal(proposeTitle('Sage Leaf Print | Sage Leaf Print | Botanical Art'), 'Sage Leaf Print, Botanical Art')
})

test('tag proposal fills toward 13 without near-duplicates or long tags', () => {
  const tags = proposeTags({ title: 'Botanical Wall Art Set of 3, Sage Green Leaf Prints', tags: ['botanical print', 'Botanical Prints', 'leaf art'] }, ['sage green wall art'])
  assert.ok(tags.length <= 13)
  assert.equal(tags.filter((t) => /botanical print/i.test(t)).length, 1)
  assert.ok(tags.every((t) => t.length <= 20))
})

test('every recommendation names a field, source, reason and proposed value', () => {
  const results = runAudit(db, shop, { research: ['lavender candle', 'soy candle'] })
  const recs = results.flatMap((r) => r.issues)
  assert.ok(recs.length > 10)
  for (const r of recs) {
    assert.ok(r.field && r.source && r.reason && r.proposed !== undefined, JSON.stringify(r))
    assert.ok(r.confidence > 0 && r.confidence <= 1)
    assert.ok(['high', 'medium', 'low'].includes(r.impact))
  }
  for (const r of results) for (const c of Object.values(r.components)) assert.ok(c.score === null || (c.score >= 0 && c.score <= 100))
})

test('a proven listing outranks an unproven one with the same issue', () => {
  const l = { listing_id: 1, title: 'Lavender Soy Candle, Hand Poured Gift', description: '', tags: ['soy candle'], images: [{ rank: 1, alt_text: 'x', width: 3000, height: 3000 }], taxonomy_id: 1, type: 'download' }
  const proven = auditListing(l, { sales: { units: 100, revenue_minor: 100000 }, maxRevenue: 100000, hero: true })
  const unproven = auditListing(l, { sales: { units: 0, revenue_minor: 0 }, maxRevenue: 100000 })
  const p = (a) => a.issues.find((i) => i.issue_type === 'tags_unused').priority
  assert.ok(p(proven) > p(unproven))
  assert.ok(proven.issues.every((i) => i.hero))
})

test('re-auditing keeps staged and dismissed decisions', () => {
  const rec = db.prepare("SELECT id FROM seo_recommendations WHERE status='suggested' LIMIT 1").get()
  db.prepare("UPDATE seo_recommendations SET status='dismissed' WHERE id=?").run(rec.id)
  runAudit(db, shop, { research: ['lavender candle', 'soy candle'] })
  assert.equal(db.prepare('SELECT status FROM seo_recommendations WHERE id=?').get(rec.id).status, 'dismissed')
})

test('opportunity scores are bounded, explained and use the right weights', async () => {
  await syncResearch(db, shop, new DemoResearchProvider(), { seeds: ['candle'] })
  let rows = keywordGaps(db, shop)
  assert.ok(rows.length >= 10)
  for (const r of rows) {
    assert.ok(r.score >= 0 && r.score <= 100)
    for (const v of Object.values(r.components)) assert.ok(v === null || (v >= 0 && v <= 100))
    assert.ok(r.formula.endsWith(`= ${r.score}`))
    assert.equal(r.official, null)
  }
  const candle = rows.find((r) => r.keyword === 'personalized candle')
  assert.equal(candle.weights.internal, WEIGHTS.without.internal)
  assert.ok(candle.evidence.listings.every((l) => /personali[sz]ed/i.test(l.title) && /candle/i.test(l.title)))

  importInsights(db, shop, 'keyword,searches_30d,listings_30d\npersonalized candle,5000,20000\n')
  rows = keywordGaps(db, shop)
  const after = rows.find((r) => r.keyword === 'personalized candle')
  assert.equal(after.weights.official, WEIGHTS.with.official)
  assert.equal(after.official.searches, 5000)
  assert.equal(after.confidence, 'high')
  // Keywords without an import never get official numbers filled in from estimates.
  assert.equal(rows.find((r) => r.keyword === 'fall candle').official, null)
})

test('Insights import rejects a file without a keyword column', () => {
  assert.throws(() => importInsights(db, shop, 'term_x,count\na,1\n'), /keyword/)
})
