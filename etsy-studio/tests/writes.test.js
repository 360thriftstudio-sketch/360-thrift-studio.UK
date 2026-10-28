import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { setup, demoShop, png } from './helpers.js'

const ctx = await setup()
const { db } = ctx
const { shop, client } = await demoShop(db, ctx)
const { saveAsset } = await import('../src/lib/assets.js')
const drafts = await import('../src/lib/drafts.js')
const { runAudit } = await import('../src/lib/seo.js')
const { applyRecommendations } = await import('../src/lib/listing-writes.js')
const { estimateJob, confirmJob, pollJob } = await import('../src/lib/creative.js')
const { DemoResearchProvider } = await import('../src/lib/krafie.js')

const image = saveAsset(db, shop, await png(), { filename: 'design.png' })
const pdf = saveAsset(db, shop, Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF'), { filename: 'planner.pdf' })

function digitalDraft(title = 'Undated Weekly Planner Printable') {
  let d = drafts.createDraft(db, shop, { kind: 'download' })
  d = drafts.updateDraftFields(db, d.id, { title, description: 'A printable weekly planner.', tags: ['weekly planner', 'printable planner'], price: 6.5, quantity: 999, taxonomy_id: 2078 })
  return d
}

test('validation catches Etsy field rules and missing assets', () => {
  const v = drafts.validateDraft({ ...drafts.DEFAULT_FIELDS, title: 'A & B & C', price: 0.1, tags: ['this tag is far too long for etsy'], type: 'physical' }, [])
  const fields = v.errors.map((e) => e.field)
  for (const f of ['title', 'description', 'price', 'taxonomy_id', 'tags', 'shipping_profile_id', 'readiness_state_id']) assert.ok(fields.includes(f), f)
  const d = digitalDraft()
  assert.equal(d.status, 'assets_incomplete')
  assert.ok(d.validation.incomplete.length === 2)
})

test('brand terms block the draft until reviewed', () => {
  const d = digitalDraft('Disney Princess Planner')
  assert.ok(d.validation.errors.some((e) => e.field === 'ip_reviewed'))
})

test('a digital draft goes to a private Etsy draft with image and file, then verifies', async () => {
  let d = digitalDraft()
  d = drafts.attachAsset(db, d.id, { asset_id: image.id, role: 'image', alt_text: 'Planner on a desk' })
  d = drafts.attachAsset(db, d.id, { asset_id: pdf.id, role: 'file' })
  assert.equal(d.status, 'ready_to_create')
  d = await drafts.pushDraft(db, shop, client, d.id)
  assert.equal(d.status, 'ready_to_publish', d.last_error)
  assert.ok(d.etsy_listing_id)
  const etsy = await client.getListing(d.etsy_listing_id)
  assert.equal(etsy.state, 'draft', 'never activated by the pipeline')
  assert.equal(etsy.images.length, 1)
  assert.equal((await client.listListingFiles(shop.shop_id, d.etsy_listing_id)).length, 1)
})

test('failure after draft creation keeps the Etsy id and resumes without duplicates', async () => {
  let d = digitalDraft('Budget Planner Printable')
  drafts.attachAsset(db, d.id, { asset_id: image.id, role: 'image', alt_text: 'Budget planner' })
  drafts.attachAsset(db, d.id, { asset_id: pdf.id, role: 'file' })
  const draftsBefore = client.state.drafts.length
  client.failNext.uploadListingFile = 'storage hiccup'
  d = await drafts.pushDraft(db, shop, client, d.id)
  assert.equal(d.status, 'needs_attention')
  assert.ok(d.etsy_listing_id, 'Etsy draft id is shown')
  assert.equal(d.stages.files.status, 'failed')
  assert.equal(d.stages.images.status, 'done')
  const createCalls = client.calls.filter((c) => c === 'createDraftListing').length
  const imageCalls = client.calls.filter((c) => c === 'uploadListingImage').length
  d = await drafts.pushDraft(db, shop, client, d.id)
  assert.equal(d.status, 'ready_to_publish', d.last_error)
  assert.equal(client.calls.filter((c) => c === 'createDraftListing').length, createCalls, 'no second create')
  assert.equal(client.calls.filter((c) => c === 'uploadListingImage').length, imageCalls, 'image not re-uploaded')
  assert.equal(client.state.drafts.length, draftsBefore + 1)
})

test('a create whose outcome is unknown is recovered, not duplicated', async () => {
  let d = digitalDraft('Meal Planner Printable')
  drafts.attachAsset(db, d.id, { asset_id: image.id, role: 'image', alt_text: 'Meal planner' })
  drafts.attachAsset(db, d.id, { asset_id: pdf.id, role: 'file' })
  const before = client.state.drafts.length
  // Etsy creates the listing, then the connection drops before we see the response.
  client.failNext.createDraftListing = {
    message: 'socket hang up',
    status: undefined,
    after: (c) => c.state.drafts.push({ ...structuredClone(c.state.drafts.at(-1)), listing_id: 7777777, title: 'Meal Planner Printable', images: [], creation_timestamp: Math.floor(Date.now() / 1000), state: 'draft' }),
  }
  d = await drafts.pushDraft(db, shop, client, d.id)
  assert.equal(d.stages.create_draft.status, 'in_flight')
  assert.equal(d.etsy_listing_id, null)
  d = await drafts.pushDraft(db, shop, client, d.id)
  assert.equal(d.etsy_listing_id, 7777777, 'adopted the listing Etsy already created')
  assert.equal(client.state.drafts.length, before + 1)
})

test('publish needs the typed phrase and fee acknowledgement', async () => {
  const d = drafts.listDrafts(db, shop.shop_id).find((x) => x.status === 'ready_to_publish')
  await assert.rejects(drafts.publishDraft(db, shop, client, d.id, { confirmText: 'publish', acknowledgeFees: true }), /Type PUBLISH/)
  await assert.rejects(drafts.publishDraft(db, shop, client, d.id, { confirmText: 'PUBLISH' }), /fee/)
  const out = await drafts.publishDraft(db, shop, client, d.id, { confirmText: 'PUBLISH', acknowledgeFees: true })
  assert.equal(out.status, 'published')
  assert.equal((await client.getListing(d.etsy_listing_id)).state, 'active')
  assert.ok(db.prepare("SELECT 1 FROM audit_log WHERE action='etsy.publish'").get())
})

test('scheduled jobs have no path to publishing or listing edits', () => {
  const src = fs.readFileSync(new URL('../src/scheduler.js', import.meta.url), 'utf8')
  assert.ok(!/drafts\.js|listing-writes\.js|publish|updateListing/.test(src.replace(/^\/\/.*$/gm, '')))
})

test('applying an SEO change: hero check, drift check, field-only patch, read-back', async () => {
  runAudit(db, shop, { research: [] })
  const rec = db.prepare("SELECT * FROM seo_recommendations WHERE field='tags' AND automatable=1 AND hero=1 LIMIT 1").get()
  await assert.rejects(applyRecommendations(db, shop, client, rec.listing_id, [rec.id], { confirm: true }), /proven listing/)
  await assert.rejects(applyRecommendations(db, shop, client, rec.listing_id, [rec.id], {}), /Confirm/)
  const before = await client.getListing(rec.listing_id)
  const r = await applyRecommendations(db, shop, client, rec.listing_id, [rec.id], { confirm: true, acknowledgeHero: true })
  assert.ok(r.results[0].ok)
  const after = await client.getListing(rec.listing_id)
  assert.deepEqual(after.tags, JSON.parse(rec.proposed_value))
  assert.equal(after.title, before.title, 'other fields untouched')
  assert.equal(db.prepare('SELECT status FROM seo_recommendations WHERE id=?').get(rec.id).status, 'applied')
  assert.ok(db.prepare("SELECT 1 FROM listing_snapshots WHERE listing_id=? AND reason='pre-edit-backup'").get(rec.listing_id))

  // Drift: the listing changed on Etsy after the audit.
  const other = db.prepare("SELECT * FROM seo_recommendations WHERE field='tags' AND automatable=1 AND status='suggested' AND hero=0 LIMIT 1").get()
  client.state.listings.find((l) => l.listing_id === other.listing_id).tags = ['changed elsewhere']
  await assert.rejects(applyRecommendations(db, shop, client, other.listing_id, [other.id], { confirm: true }), /Changed on Etsy/)
})

test('creative jobs: one submission per confirmation, resumable polling', async () => {
  const provider = new DemoResearchProvider()
  let submits = 0
  const orig = provider.submit.bind(provider)
  provider.submit = async (...a) => {
    submits++
    return orig(...a)
  }
  await assert.rejects(estimateJob(db, shop, provider, { kind: 'image', params: { prompt: 'Pokemon poster' } }), /brand/)
  const job = await estimateJob(db, shop, provider, { kind: 'image', params: { prompt: 'Sage green botanical line art' } })
  assert.equal(job.status, 'estimated')
  await confirmJob(db, shop, provider, job.id)
  await confirmJob(db, shop, provider, job.id)
  assert.equal(submits, 1)
  const done = await pollJob(db, shop, provider, job.id)
  assert.equal(done.status, 'completed')
  assert.ok(done.output_asset_id)
  const asset = db.prepare('SELECT * FROM assets WHERE id=?').get(done.output_asset_id)
  assert.equal(asset.mime, 'image/png')
  assert.equal(asset.width, 1200)
})

test('a dropped submission is marked unknown and never resubmitted', async () => {
  const provider = new DemoResearchProvider()
  provider.submit = async () => {
    throw new Error('ECONNRESET')
  }
  const job = await estimateJob(db, shop, provider, { kind: 'image', params: { prompt: 'Original abstract shapes' } })
  const j = await confirmJob(db, shop, provider, job.id)
  assert.equal(j.status, 'unknown')
  let called = false
  provider.submit = async () => {
    called = true
  }
  await confirmJob(db, shop, provider, job.id)
  assert.equal(called, false)
})
