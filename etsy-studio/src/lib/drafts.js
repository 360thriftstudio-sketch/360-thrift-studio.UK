// Local drafts → private Etsy drafts → (explicit) publish.
// The pipeline is a resumable state machine: each stage records its result, finished uploads are
// remembered per asset, and a retry continues from the failed stage without creating a second listing.
import { ETSY_LIMITS, WHEN_MADE, WHO_MADE, getConfig } from './config.js'
import { audit, json, newId, now, parse } from './db.js'
import { getAsset, readAsset, roleProblem } from './assets.js'
import { promptProblem } from './creative.js'
import { readToken } from './oauth.js'
import { titleCase, tokens, words, STOP_WORDS } from './text.js'
import { fromEtsyMoney } from './money.js'

export const STAGES = ['create_draft', 'images', 'video', 'files', 'inventory', 'readback']
export const PUBLISH_PHRASE = 'PUBLISH'

export const DEFAULT_FIELDS = {
  type: 'download',
  title: '',
  description: '',
  tags: [],
  materials: [],
  price: null,
  quantity: 999,
  sku: '',
  taxonomy_id: null,
  who_made: 'i_did',
  when_made: 'made_to_order',
  is_supply: false,
  shop_section_id: null,
  should_auto_renew: true,
  is_taxable: true,
  shipping_profile_id: null,
  readiness_state_id: null,
  return_policy_id: null,
  production_partner_ids: [],
  item_weight: null,
  item_weight_unit: 'oz',
  item_length: null,
  item_width: null,
  item_height: null,
  item_dimensions_unit: 'in',
  is_personalizable: false,
  personalization_is_required: false,
  personalization_char_count_max: null,
  personalization_instructions: '',
  ip_reviewed: false,
}

// ---------- listing generator ----------

const cap = (s) => titleCase(String(s ?? '').trim())
const uniqWords = (s) => {
  const seen = new Set()
  return String(s)
    .split(/\s+/)
    .filter((w) => {
      const k = w.toLowerCase().replace(/[^\w]/g, '')
      if (!k || seen.has(k)) return false
      seen.add(k)
      return true
    })
    .join(' ')
}

/** One recommended listing plus alternatives, built from the brief. Deterministic; no external AI. */
export function generateListing(brief, { researchKeywords = [] } = {}) {
  const kw = String(brief.keyword ?? '').trim()
  const product = String(brief.product_type ?? '').trim() || kw
  const style = String(brief.style ?? '').trim()
  const audience = String(brief.audience ?? '').trim()
  const occasion = String(brief.occasion ?? '').trim()
  const digital = brief.product_kind !== 'physical'
  const name = uniqWords(cap([style, product].filter(Boolean).join(' ')))
  const trim = (t) => t.slice(0, ETSY_LIMITS.titleMaxChars)
  const recommended = trim(
    uniqWords([name, audience && `for ${cap(audience)}`].filter(Boolean).join(' ')) +
      (occasion ? `, ${cap(occasion)}` : '') +
      (kw && !tokens(name).every((t) => tokens(kw).includes(t)) ? `, ${cap(kw)}` : '') +
      (digital ? ', Printable' : ''),
  )
  const alternatives = [
    trim(uniqWords(`${cap(kw || product)}${style ? ` – ${cap(style)}` : ''}${digital ? ' Digital Download' : ''}`)),
    trim(uniqWords(`${occasion ? cap(occasion) + ' ' : ''}${name}${audience ? ` Gift for ${cap(audience)}` : ''}`)),
  ].filter((t, i, a) => t && t !== recommended && a.indexOf(t) === i)

  const tagPool = [
    kw,
    product,
    style && `${style} ${product.split(/\s+/).slice(-1)[0]}`,
    audience && `gift for ${audience}`,
    occasion && `${occasion} gift`,
    occasion,
    digital && 'instant download',
    digital && `printable ${product.split(/\s+/).slice(-1)[0]}`,
    // Only research phrases fully supported by the brief, so a cedar candle never gets “christmas candle”.
    ...researchKeywords.filter((k) => { const b = new Set(tokens(`${kw} ${product} ${style} ${audience} ${occasion}`)); return tokens(k).every((t) => b.has(t)) }),
    ...pairs(words(`${style} ${product}`)),
  ]
  const tags = []
  const seen = new Set()
  for (const t of tagPool) {
    if (!t) continue
    const v = String(t).toLowerCase().trim().replace(/\s+/g, ' ')
    const k = tokens(v).sort().join(' ')
    if (!k || seen.has(k) || v.length > ETSY_LIMITS.tagMaxChars || !/^[\p{L}\p{N}\s'\-]+$/u.test(v)) continue
    seen.add(k)
    tags.push(v)
    if (tags.length >= ETSY_LIMITS.tagsMax) break
  }

  const description = [
    `${name}${digital ? ' — an instant digital download.' : ', made for you.'}`,
    '',
    audience || occasion ? `Made for ${[audience, occasion && `${occasion}`].filter(Boolean).join(' · ')}.` : null,
    '',
    'What you get:',
    digital ? '- High-resolution files (see the listing photos for formats and sizes)' : '- One item, as shown in the photos',
    '',
    digital ? 'How it works:\n- Purchase and download from your Etsy Purchases page\n- Print at home or at a print shop\n- No physical item will be shipped' : 'Details:\n- Materials: \n- Size: \n- Processing time: see shipping section',
    brief.notes ? `\n${brief.notes}` : null,
  ]
    .filter((x) => x !== null)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
  return { recommended: { title: recommended, tags, description }, alternatives }
}

function pairs(w) {
  const out = []
  for (let i = 0; i < w.length - 1; i++) if (!STOP_WORDS.has(w[i]) && !STOP_WORDS.has(w[i + 1])) out.push(`${w[i]} ${w[i + 1]}`)
  return out
}

// ---------- validation ----------

const TITLE_ONCE = ['%', ':', '&', '+'] // Etsy: each may appear at most once in a title (verify in docs)

export function validateDraft(fields, assets = []) {
  const errors = []
  const warnings = []
  const e = (field, msg) => errors.push({ field, msg })
  const f = { ...DEFAULT_FIELDS, ...fields }
  const digital = f.type === 'download'

  const title = String(f.title ?? '').trim()
  if (!title) e('title', 'Title is required.')
  if (title.length > ETSY_LIMITS.titleMaxChars) e('title', `Title is ${title.length}/${ETSY_LIMITS.titleMaxChars} characters.`)
  for (const ch of TITLE_ONCE) if (title.split(ch).length > 2) e('title', `“${ch}” can be used only once in a title.`)
  if (title && title.split(/\s+/).length > 15) warnings.push({ field: 'title', msg: 'Over 15 words — consider a clearer name (heuristic).' })
  if (!String(f.description ?? '').trim()) e('description', 'Description is required.')
  const price = Number(f.price)
  if (!Number.isFinite(price) || price < ETSY_LIMITS.minPrice) e('price', `Price must be at least ${ETSY_LIMITS.minPrice}.`)
  const qty = Number(f.quantity)
  if (!Number.isInteger(qty) || qty < 1 || qty > ETSY_LIMITS.quantityMax) e('quantity', `Quantity must be 1–${ETSY_LIMITS.quantityMax}.`)
  if (!f.taxonomy_id) e('taxonomy_id', 'Choose a category.')
  if (!WHO_MADE.includes(f.who_made)) e('who_made', 'Choose who made it.')
  if (!WHEN_MADE.includes(f.when_made)) e('when_made', 'Choose when it was made.')
  const tags = f.tags ?? []
  if (tags.length > ETSY_LIMITS.tagsMax) e('tags', `At most ${ETSY_LIMITS.tagsMax} tags.`)
  for (const t of tags) {
    if (t.length > ETSY_LIMITS.tagMaxChars) e('tags', `“${t}” is over ${ETSY_LIMITS.tagMaxChars} characters.`)
    if (!/^[\p{L}\p{N}\s'’\-™©®]+$/u.test(t)) e('tags', `“${t}” has characters Etsy doesn't allow in tags.`)
  }
  if (tags.length < ETSY_LIMITS.tagsMax) warnings.push({ field: 'tags', msg: `${tags.length}/${ETSY_LIMITS.tagsMax} tags used.` })
  if ((f.materials ?? []).length > ETSY_LIMITS.materialsMax) e('materials', `At most ${ETSY_LIMITS.materialsMax} materials.`)
  if (f.sku && String(f.sku).length > 32) e('sku', 'SKU must be 32 characters or fewer.')
  if (!digital) {
    if (!f.shipping_profile_id) e('shipping_profile_id', 'Physical listings need a shipping profile.')
    if (!f.readiness_state_id) e('readiness_state_id', 'Physical listings need a processing profile.')
  }
  if (f.is_personalizable) {
    if (!String(f.personalization_instructions ?? '').trim()) e('personalization_instructions', 'Tell buyers what to enter.')
    const n = Number(f.personalization_char_count_max)
    if (f.personalization_char_count_max && (!Number.isInteger(n) || n < 1 || n > ETSY_LIMITS.personalizationCharMax)) e('personalization_char_count_max', `1–${ETSY_LIMITS.personalizationCharMax} characters.`)
  }

  const images = assets.filter((a) => a.role === 'image')
  const files = assets.filter((a) => a.role === 'file')
  const videos = assets.filter((a) => a.role === 'video')
  if (images.length > ETSY_LIMITS.imagesMax) e('images', `At most ${ETSY_LIMITS.imagesMax} images.`)
  if (files.length > ETSY_LIMITS.filesMax) e('files', `At most ${ETSY_LIMITS.filesMax} digital files.`)
  if (videos.length > 1) e('video', 'One listing video only.')
  if (!digital && files.length) e('files', 'Downloadable files apply to digital listings only.')
  for (const a of assets) {
    const p = a.asset ? roleProblem(a.asset, a.role) : 'Missing file'
    if (p) e(a.role === 'image' ? 'images' : a.role === 'video' ? 'video' : 'files', `${a.asset?.filename ?? a.asset_id}: ${p}`)
    if (a.alt_text && a.alt_text.length > ETSY_LIMITS.altTextMaxChars) e('images', `Alt text over ${ETSY_LIMITS.altTextMaxChars} characters.`)
  }
  const incomplete = []
  if (!images.length) incomplete.push('Add at least one listing image.')
  if (digital && !files.length) incomplete.push('Attach the digital file buyers download.')
  if (images.length && images.some((a) => !a.alt_text)) warnings.push({ field: 'images', msg: 'Some images have no alt text.' })

  // IP / policy screen
  const ip = promptProblem(`${title} ${tags.join(' ')} ${f.description ?? ''}`)
  if (ip && !/Describe/.test(ip)) {
    if (f.ip_reviewed) warnings.push({ field: 'title', msg: `Reviewed: ${ip}` })
    else e('ip_reviewed', `${ip} Remove it, or confirm you have the rights.`)
  }
  return { errors, warnings, incomplete, ok: errors.length === 0, ready: errors.length === 0 && incomplete.length === 0 }
}

// ---------- persistence ----------

export function createDraft(db, shop, { kind = 'download', brief_id = null, fields = {} } = {}) {
  const id = newId('drf')
  const f = { ...DEFAULT_FIELDS, ...fields, type: kind === 'physical' ? 'physical' : 'download' }
  if (f.type === 'physical' && fields.quantity === undefined) f.quantity = 1
  db.prepare(
    `INSERT INTO listing_drafts (id, shop_id, brief_id, kind, fields_json, status, idempotency_key, stages_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'local_draft', ?, '{}', ?, ?)`,
  ).run(id, shop.shop_id, brief_id, f.type, json(f), newId('idem'), now(), now())
  audit(db, 'draft.create', { shopId: shop.shop_id, target: id })
  return refreshStatus(db, id)
}

export function draftAssets(db, draftId) {
  return db
    .prepare('SELECT * FROM draft_assets WHERE draft_id = ? ORDER BY role, rank')
    .all(draftId)
    .map((r) => ({ ...r, asset: getAsset(db, r.asset_id) }))
}

export function getDraft(db, id) {
  const r = db.prepare('SELECT * FROM listing_drafts WHERE id = ?').get(id)
  if (!r) return null
  const fields = { ...DEFAULT_FIELDS, ...parse(r.fields_json, {}) }
  const assets = draftAssets(db, id)
  return { ...r, fields, stages: parse(r.stages_json, {}), readback: parse(r.readback_json), assets, validation: validateDraft(fields, assets) }
}

const LOCKED = new Set(['pushing', 'published'])
const EDITABLE_AFTER_ETSY = new Set(['etsy_draft_created', 'needs_attention', 'ready_to_publish', 'validation_failed'])

/** Status before any Etsy write depends only on validation. */
export function refreshStatus(db, id) {
  const d = getDraft(db, id)
  if (!d || d.etsy_listing_id || LOCKED.has(d.status)) return d
  const status = !d.validation.ok ? 'local_draft' : !d.validation.ready ? 'assets_incomplete' : 'ready_to_create'
  if (status !== d.status) db.prepare('UPDATE listing_drafts SET status=?, updated_at=? WHERE id=?').run(status, now(), id)
  return getDraft(db, id)
}

export function updateDraftFields(db, id, patch) {
  const d = getDraft(db, id)
  if (!d) throw Object.assign(new Error('Draft not found'), { status: 404 })
  if (LOCKED.has(d.status)) throw Object.assign(new Error(`A ${d.status} draft can't be edited here.`), { status: 409 })
  const allowed = Object.keys(DEFAULT_FIELDS)
  const next = { ...d.fields }
  for (const [k, v] of Object.entries(patch ?? {})) if (allowed.includes(k)) next[k] = v
  if (d.etsy_listing_id && next.type !== d.fields.type) throw Object.assign(new Error("Type can't change after the Etsy draft exists."), { status: 409 })
  next.tags = (Array.isArray(next.tags) ? next.tags : String(next.tags ?? '').split(',')).map((t) => String(t).trim()).filter(Boolean)
  next.materials = (Array.isArray(next.materials) ? next.materials : String(next.materials ?? '').split(',')).map((t) => String(t).trim()).filter(Boolean)
  db.prepare('UPDATE listing_drafts SET fields_json=?, updated_at=? WHERE id=?').run(json(next), now(), id)
  // An edited Etsy draft needs pushing and verifying again before it can be published.
  if (d.etsy_listing_id && EDITABLE_AFTER_ETSY.has(d.status)) {
    const stages = { ...d.stages, readback: { status: 'stale', at: now() }, sync_fields: { status: 'pending', at: now() } }
    db.prepare("UPDATE listing_drafts SET status='needs_attention', stages_json=?, last_error=? WHERE id=?").run(json(stages), 'Edited locally — push again to update the Etsy draft.', id)
  }
  return refreshStatus(db, id)
}

export function attachAsset(db, draftId, { asset_id, role, alt_text = null, rank }) {
  const d = getDraft(db, draftId)
  if (!d) throw Object.assign(new Error('Draft not found'), { status: 404 })
  if (LOCKED.has(d.status)) throw Object.assign(new Error('Draft is locked.'), { status: 409 })
  const a = getAsset(db, asset_id)
  if (!a) throw Object.assign(new Error('Asset not found'), { status: 404 })
  const problem = roleProblem(a, role)
  if (problem) throw Object.assign(new Error(problem), { status: 400 })
  const r = rank ?? (db.prepare('SELECT COALESCE(MAX(rank),0)+1 n FROM draft_assets WHERE draft_id=? AND role=?').get(draftId, role).n)
  db.prepare('INSERT OR REPLACE INTO draft_assets (draft_id, asset_id, role, rank, alt_text) VALUES (?, ?, ?, ?, ?)').run(draftId, asset_id, role, r, alt_text ? String(alt_text).slice(0, ETSY_LIMITS.altTextMaxChars) : null)
  return refreshStatus(db, draftId)
}

export function detachAsset(db, draftId, assetId, role) {
  const link = db.prepare('SELECT * FROM draft_assets WHERE draft_id=? AND asset_id=? AND role=?').get(draftId, assetId, role)
  if (link?.etsy_ref) throw Object.assign(new Error('Already uploaded to the Etsy draft — remove it in Etsy.'), { status: 409 })
  db.prepare('DELETE FROM draft_assets WHERE draft_id=? AND asset_id=? AND role=?').run(draftId, assetId, role)
  return refreshStatus(db, draftId)
}

export function listDrafts(db, shopId) {
  return db
    .prepare('SELECT id FROM listing_drafts WHERE shop_id = ? ORDER BY updated_at DESC')
    .all(shopId)
    .map((r) => getDraft(db, r.id))
}

// ---------- Etsy pipeline ----------

export function writesAllowed(shop) {
  if (shop.is_demo) return { ok: true }
  const cfg = getConfig().etsy
  if (!cfg.writesEnabled) return { ok: false, reason: 'Writes are off. Set ETSY_ENABLE_WRITES=1 and run `npm run auth` to add listings_w.' }
  const token = readToken()
  if (!token?.scopes?.includes('listings_w')) return { ok: false, reason: 'The Etsy connection lacks listings_w. Run `npm run auth` again.' }
  return { ok: true }
}

function etsyFields(f, { forUpdate = false } = {}) {
  const out = {
    title: f.title.trim(),
    description: f.description,
    tags: f.tags,
    materials: f.materials,
    price: Number(f.price),
    quantity: Number(f.quantity),
    taxonomy_id: Number(f.taxonomy_id),
    who_made: f.who_made,
    when_made: f.when_made,
    is_supply: !!f.is_supply,
    type: f.type,
    shop_section_id: f.shop_section_id || undefined,
    should_auto_renew: !!f.should_auto_renew,
    is_taxable: !!f.is_taxable,
    production_partner_ids: f.production_partner_ids?.length ? f.production_partner_ids : undefined,
    is_personalizable: !!f.is_personalizable,
    personalization_is_required: f.is_personalizable ? !!f.personalization_is_required : undefined,
    personalization_char_count_max: f.is_personalizable && f.personalization_char_count_max ? Number(f.personalization_char_count_max) : undefined,
    personalization_instructions: f.is_personalizable ? f.personalization_instructions : undefined,
  }
  if (f.type === 'physical') {
    Object.assign(out, {
      shipping_profile_id: Number(f.shipping_profile_id),
      readiness_state_id: Number(f.readiness_state_id),
      return_policy_id: f.return_policy_id ? Number(f.return_policy_id) : undefined,
      item_weight: f.item_weight || undefined,
      item_weight_unit: f.item_weight ? f.item_weight_unit : undefined,
      item_length: f.item_length || undefined,
      item_width: f.item_width || undefined,
      item_height: f.item_height || undefined,
      item_dimensions_unit: f.item_length || f.item_width || f.item_height ? f.item_dimensions_unit : undefined,
    })
  }
  if (forUpdate) {
    delete out.type
    delete out.quantity // inventory owns quantity once the listing exists
    delete out.price
  }
  return out
}

function setStage(db, id, stage, patch) {
  const d = db.prepare('SELECT stages_json FROM listing_drafts WHERE id=?').get(id)
  const stages = parse(d.stages_json, {})
  stages[stage] = { ...stages[stage], ...patch, at: now() }
  db.prepare('UPDATE listing_drafts SET stages_json=?, updated_at=? WHERE id=?').run(json(stages), now(), id)
  return stages
}

function jobLog(db, draftId, stage, status, error = null, detail = null) {
  db.prepare('INSERT INTO publish_jobs (draft_id, stage, status, started_at, finished_at, error, detail_json) VALUES (?, ?, ?, ?, ?, ?, ?)').run(draftId, stage, status, now(), now(), error, json(detail))
}

/**
 * Create or resume the private Etsy draft. Never activates the listing.
 * Returns the refreshed draft; on failure the draft carries the failed stage and any Etsy listing id.
 */
export async function pushDraft(db, shop, client, id) {
  let d = getDraft(db, id)
  if (!d || d.shop_id !== shop.shop_id) throw Object.assign(new Error('Draft not found'), { status: 404 })
  if (d.status === 'published') throw Object.assign(new Error('Already published.'), { status: 409 })
  const allowed = writesAllowed(shop)
  if (!allowed.ok) throw Object.assign(new Error(allowed.reason), { status: 403 })
  if (!d.validation.ok) {
    db.prepare("UPDATE listing_drafts SET status=?, last_error=? WHERE id=?").run(d.etsy_listing_id ? 'validation_failed' : 'local_draft', d.validation.errors.map((x) => x.msg).join(' '), id)
    throw Object.assign(new Error('Fix the validation errors first.'), { status: 400, validation: d.validation })
  }
  if (!d.validation.ready) throw Object.assign(new Error(d.validation.incomplete.join(' ')), { status: 400 })
  const claimed = db.prepare("UPDATE listing_drafts SET status='pushing', last_error=NULL, updated_at=? WHERE id=? AND status != 'pushing'").run(now(), id)
  if (!claimed.changes) throw Object.assign(new Error('This draft is already being sent to Etsy.'), { status: 409 })

  let stage = 'create_draft'
  try {
    // 1. Create the draft listing exactly once.
    if (!d.etsy_listing_id) {
      if (d.stages.create_draft?.status === 'in_flight') {
        // A previous attempt may have reached Etsy before the app stopped. Look before creating again.
        const startedAt = Date.parse(d.stages.create_draft.at) - 120_000
        const existing = (await client.listListings(shop.shop_id, 'draft')).find(
          (l) => l.title === d.fields.title.trim() && (l.creation_timestamp ?? 0) * 1000 >= startedAt,
        )
        if (existing) {
          db.prepare('UPDATE listing_drafts SET etsy_listing_id=? WHERE id=?').run(existing.listing_id, id)
          setStage(db, id, stage, { status: 'done', listing_id: existing.listing_id, recovered: true })
          jobLog(db, id, stage, 'recovered', null, { listing_id: existing.listing_id })
        }
      }
      d = getDraft(db, id)
      if (!d.etsy_listing_id) {
        setStage(db, id, stage, { status: 'in_flight' })
        const created = await client.createDraftListing(shop.shop_id, etsyFields(d.fields))
        db.prepare('UPDATE listing_drafts SET etsy_listing_id=? WHERE id=?').run(created.listing_id, id)
        setStage(db, id, stage, { status: 'done', listing_id: created.listing_id })
        jobLog(db, id, stage, 'done', null, { listing_id: created.listing_id })
        audit(db, 'etsy.draft.create', { shopId: shop.shop_id, target: created.listing_id, detail: { draft: id, title: d.fields.title } })
      }
    } else if (d.stages.sync_fields?.status === 'pending') {
      stage = 'sync_fields'
      await client.updateListing(shop.shop_id, d.etsy_listing_id, etsyFields(d.fields, { forUpdate: true }))
      setStage(db, id, stage, { status: 'done' })
      jobLog(db, id, stage, 'done')
      audit(db, 'etsy.draft.update', { shopId: shop.shop_id, target: d.etsy_listing_id, detail: { draft: id } })
    }
    d = getDraft(db, id)
    const listingId = d.etsy_listing_id

    // 2-4. Uploads, each asset at most once.
    for (const [st, role, fn] of [
      ['images', 'image', (a, buf, link) => client.uploadListingImage(shop.shop_id, listingId, { buffer: buf, filename: a.filename, mime: a.mime, rank: link.rank, altText: link.alt_text })],
      ['video', 'video', (a, buf) => client.uploadListingVideo(shop.shop_id, listingId, { buffer: buf, filename: a.filename, mime: a.mime })],
      ['files', 'file', (a, buf, link) => client.uploadListingFile(shop.shop_id, listingId, { buffer: buf, filename: a.filename, mime: a.mime, rank: link.rank })],
    ]) {
      stage = st
      const links = d.assets.filter((x) => x.role === role)
      if (!links.length) {
        setStage(db, id, st, { status: 'skipped' })
        continue
      }
      for (const link of links) {
        if (link.etsy_ref) continue
        try {
          const r = await fn(link.asset, readAsset(link.asset), link)
          const ref = r.listing_image_id ?? r.listing_file_id ?? r.video_id ?? 'uploaded'
          db.prepare('UPDATE draft_assets SET etsy_ref=?, upload_error=NULL WHERE draft_id=? AND asset_id=? AND role=?').run(String(ref), id, link.asset_id, role)
        } catch (err) {
          db.prepare('UPDATE draft_assets SET upload_error=? WHERE draft_id=? AND asset_id=? AND role=?').run(err.message.slice(0, 300), id, link.asset_id, role)
          throw err
        }
      }
      setStage(db, id, st, { status: 'done', count: links.length })
      jobLog(db, id, st, 'done', null, { count: links.length })
    }

    // 5. SKU through inventory (single product, no variations).
    stage = 'inventory'
    if (d.fields.sku) {
      await client.updateInventory(listingId, {
        products: [{ sku: d.fields.sku, property_values: [], offerings: [{ price: Number(d.fields.price), quantity: Number(d.fields.quantity), is_enabled: true }] }],
      })
      setStage(db, id, stage, { status: 'done' })
      jobLog(db, id, stage, 'done')
    } else setStage(db, id, stage, { status: 'skipped' })

    // 6. Read back and reconcile.
    stage = 'readback'
    const rb = await readBack(client, shop, d)
    setStage(db, id, stage, { status: rb.ok ? 'done' : 'mismatch' })
    jobLog(db, id, stage, rb.ok ? 'done' : 'mismatch', null, rb)
    db.prepare('UPDATE listing_drafts SET status=?, readback_json=?, last_error=?, updated_at=? WHERE id=?').run(
      rb.ok ? 'ready_to_publish' : 'needs_attention',
      json(rb),
      rb.ok ? null : `Etsy differs on: ${rb.mismatches.map((m) => m.field).join(', ')}`,
      now(),
      id,
    )
  } catch (err) {
    // No HTTP status on create means the outcome is unknown (e.g. connection dropped): keep the
    // in-flight marker so the next attempt looks for the listing on Etsy before creating another.
    const unknown = stage === 'create_draft' && !err.status
    setStage(db, id, stage, { status: unknown ? 'in_flight' : 'failed', error: err.message.slice(0, 400) })
    jobLog(db, id, stage, unknown ? 'unknown' : 'failed', err.message.slice(0, 400))
    const hasListing = !!getDraft(db, id).etsy_listing_id
    db.prepare('UPDATE listing_drafts SET status=?, last_error=?, updated_at=? WHERE id=?').run(
      hasListing ? 'needs_attention' : err.permanent ? 'validation_failed' : 'ready_to_create',
      `${stage}: ${err.message}`.slice(0, 500),
      now(),
      id,
    )
  }
  return getDraft(db, id)
}

export async function readBack(client, shop, d) {
  const l = await client.getListing(d.etsy_listing_id)
  const files = d.fields.type === 'download' ? await client.listListingFiles(shop.shop_id, d.etsy_listing_id) : []
  const f = d.fields
  const price = fromEtsyMoney(l.price).minor
  const sameSet = (a = [], b = []) => a.length === b.length && a.every((x) => b.map((y) => y.toLowerCase()).includes(x.toLowerCase()))
  const checks = [
    ['title', l.title?.trim() === f.title.trim(), l.title],
    ['description', (l.description ?? '').trim() === f.description.trim(), `${(l.description ?? '').length} chars`],
    ['tags', sameSet(f.tags, l.tags ?? []), l.tags],
    ['price', price === Math.round(Number(f.price) * 100), price / 100],
    ['quantity', Number(l.quantity) === Number(f.quantity), l.quantity],
    ['taxonomy_id', Number(l.taxonomy_id) === Number(f.taxonomy_id), l.taxonomy_id],
    ['type', (l.listing_type ?? l.type) === f.type, l.listing_type ?? l.type],
    ['images', (l.images ?? []).length >= d.assets.filter((a) => a.role === 'image').length, (l.images ?? []).length],
    ['files', files.length >= d.assets.filter((a) => a.role === 'file').length, files.length],
    ['state', l.state === 'draft', l.state],
  ]
  const mismatches = checks.filter(([, ok]) => !ok).map(([field, , etsy]) => ({ field, etsy }))
  return { ok: mismatches.length === 0, at: now(), state: l.state, mismatches, image_count: (l.images ?? []).length, files: files.map((x) => ({ name: x.filename, size: x.filesize })) }
}

/**
 * Activate an Etsy draft. Only ever called from an explicit operator request carrying the typed phrase.
 * Scheduled jobs have no route to this function.
 */
export async function publishDraft(db, shop, client, id, { confirmText, acknowledgeFees } = {}) {
  const d = getDraft(db, id)
  if (!d || d.shop_id !== shop.shop_id) throw Object.assign(new Error('Draft not found'), { status: 404 })
  if (confirmText !== PUBLISH_PHRASE) throw Object.assign(new Error(`Type ${PUBLISH_PHRASE} to confirm.`), { status: 400 })
  if (!acknowledgeFees) throw Object.assign(new Error('Acknowledge the Etsy listing fee first.'), { status: 400 })
  if (d.status !== 'ready_to_publish') throw Object.assign(new Error(`Draft is ${d.status.replace(/_/g, ' ')}, not ready to publish.`), { status: 409 })
  const allowed = writesAllowed(shop)
  if (!allowed.ok) throw Object.assign(new Error(allowed.reason), { status: 403 })
  // Fresh read-back right before activation.
  const rb = await readBack(client, shop, d)
  if (!rb.ok) {
    db.prepare("UPDATE listing_drafts SET status='needs_attention', readback_json=?, last_error=? WHERE id=?").run(json(rb), 'Etsy draft changed since review', id)
    throw Object.assign(new Error('The Etsy draft no longer matches what you reviewed. Review it again.'), { status: 409 })
  }
  await client.updateListing(shop.shop_id, d.etsy_listing_id, { state: 'active' })
  const after = await client.getListing(d.etsy_listing_id)
  const ok = after.state === 'active'
  db.prepare('UPDATE listing_drafts SET status=?, published_at=?, last_error=?, updated_at=? WHERE id=?').run(ok ? 'published' : 'needs_attention', ok ? now() : null, ok ? null : `Etsy reports state ${after.state}`, now(), id)
  jobLog(db, id, 'publish', ok ? 'done' : 'mismatch', null, { state: after.state })
  audit(db, 'etsy.publish', { shopId: shop.shop_id, target: d.etsy_listing_id, detail: { draft: id, title: d.fields.title, state: after.state } })
  return getDraft(db, id)
}
