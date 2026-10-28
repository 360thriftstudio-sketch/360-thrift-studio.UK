// Apply approved SEO changes to an existing listing: back up → check drift → patch only
// approved fields → read back → record before/after with a performance baseline.
import { audit, json, now, parse, tx } from './db.js'
import { normalizeListing } from './etsy-sync.js'
import { recRow } from './seo.js'
import { writesAllowed } from './drafts.js'

export const PATCHABLE = new Set(['title', 'tags', 'description', 'materials', 'taxonomy_id'])

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

export async function applyRecommendations(db, shop, client, listingId, recIds, { confirm = false, acknowledgeHero = false } = {}) {
  if (confirm !== true) throw Object.assign(new Error('Confirm the change summary first.'), { status: 400 })
  const allowed = writesAllowed(shop)
  if (!allowed.ok) throw Object.assign(new Error(allowed.reason), { status: 403 })
  const recs = recIds.map((id) => db.prepare('SELECT * FROM seo_recommendations WHERE id = ? AND shop_id = ? AND listing_id = ?').get(id, shop.shop_id, Number(listingId))).filter(Boolean).map(recRow)
  if (!recs.length) throw Object.assign(new Error('No matching recommendations.'), { status: 404 })
  const notPatchable = recs.filter((r) => !r.automatable || !PATCHABLE.has(r.field))
  if (notPatchable.length) throw Object.assign(new Error(`${notPatchable.map((r) => r.field).join(', ')} must be changed in Etsy directly.`), { status: 400 })
  const fields = new Set()
  for (const r of recs) {
    if (fields.has(r.field)) throw Object.assign(new Error(`Choose one change per field (${r.field}).`), { status: 400 })
    fields.add(r.field)
  }
  if (recs.some((r) => r.hero) && !acknowledgeHero) throw Object.assign(new Error('This is a proven listing. Tick “I have reviewed this hero listing” to continue.'), { status: 400 })

  // 1. Fresh copy from Etsy, saved as a backup.
  const before = normalizeListing(await client.getListing(listingId))
  db.prepare('INSERT INTO listing_snapshots (shop_id, listing_id, captured_at, reason, data_json) VALUES (?, ?, ?, ?, ?)').run(shop.shop_id, before.listing_id, now(), 'pre-edit-backup', json(before))

  // 2. Drift check: the field must still hold the value the suggestion was made against.
  const drifted = recs.filter((r) => r.field !== 'description' ? !same(before[r.field], r.current_value) : (before.description ?? '') !== (r.current_value ?? ''))
  if (drifted.length) throw Object.assign(new Error(`Changed on Etsy since the audit: ${drifted.map((r) => r.field).join(', ')}. Refresh and review again.`), { status: 409 })

  // 3. Patch only the approved fields.
  const patch = Object.fromEntries(recs.map((r) => [r.field, r.proposed_value]))
  const approvedAt = now()
  let error = null
  try {
    await client.updateListing(shop.shop_id, listingId, patch)
  } catch (e) {
    error = e.message
  }

  // 4. Read back and record.
  const after = normalizeListing(await client.getListing(listingId))
  const results = recs.map((r) => {
    const value = after[r.field]
    const ok = !error && (Array.isArray(r.proposed_value) ? same([...value].sort(), [...r.proposed_value].sort()) : same(value, r.proposed_value))
    return { rec: r, ok, value }
  })
  tx(db, () => {
    for (const { rec, ok, value } of results) {
      db.prepare(
        `INSERT INTO recommendation_changes (recommendation_id, shop_id, listing_id, field, old_value, new_value, approved_at, applied_at, readback_ok, readback_value, baseline_json, error)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(rec.id, shop.shop_id, rec.listing_id, rec.field, json(before[rec.field]), json(rec.proposed_value), approvedAt, now(), ok ? 1 : 0, json(value), json(rec.baseline), error)
      if (ok) db.prepare("UPDATE seo_recommendations SET status='applied', updated_at=? WHERE id=?").run(now(), rec.id)
    }
    db.prepare("UPDATE listings SET data_json=?, title=?, updated_at=? WHERE listing_id=?").run(json(after), after.title, now(), after.listing_id)
    db.prepare('INSERT INTO listing_snapshots (shop_id, listing_id, captured_at, reason, data_json) VALUES (?, ?, ?, ?, ?)').run(shop.shop_id, after.listing_id, now(), 'post-edit', json(after))
  })
  audit(db, 'etsy.listing.update', { shopId: shop.shop_id, target: listingId, detail: { fields: [...fields], ok: results.every((r) => r.ok), error } })
  if (error) throw Object.assign(new Error(`Etsy rejected the update: ${error}`), { status: 502 })
  return { listing_id: Number(listingId), results: results.map(({ rec, ok, value }) => ({ id: rec.id, field: rec.field, ok, etsy_value: value })) }
}

/** Applied changes with the performance before and after, for the learning loop. Correlation only. */
export function changeOutcomes(db, shopId, nowMs = Date.now()) {
  const rows = db.prepare('SELECT * FROM recommendation_changes WHERE shop_id = ? AND readback_ok = 1 ORDER BY applied_at DESC LIMIT 50').all(shopId)
  return rows.map((c) => {
    const applied = Date.parse(c.applied_at)
    const days = Math.max(1, Math.min(30, Math.floor((nowMs - applied) / 86400_000)))
    const q = db.prepare(
      `SELECT COALESCE(SUM(t.quantity),0) units, COALESCE(SUM(t.quantity*t.price_minor),0) revenue FROM receipt_transactions t JOIN receipts_sanitized r ON r.receipt_id=t.receipt_id
       WHERE t.listing_id=? AND r.created_at>=? AND r.created_at<? AND r.is_paid=1`,
    )
    const pre = q.get(c.listing_id, new Date(applied - days * 86400_000).toISOString(), new Date(applied).toISOString())
    const post = q.get(c.listing_id, new Date(applied).toISOString(), new Date(applied + days * 86400_000).toISOString())
    const listing = parse(db.prepare('SELECT data_json FROM listings WHERE listing_id=?').get(c.listing_id)?.data_json, {})
    const baseline = parse(c.baseline_json, {})
    return {
      listing_id: c.listing_id,
      title: listing.title,
      field: c.field,
      applied_at: c.applied_at,
      window_days: days,
      before: { units: pre.units, revenue_minor: pre.revenue },
      after: { units: post.units, revenue_minor: post.revenue },
      favorites: { at_change: baseline.favorites ?? null, now: listing.num_favorers ?? null },
      maturing: (nowMs - applied) / 86400_000 < 14,
      note: 'Observed change in the same-length windows before and after. Not proof the edit caused it.',
    }
  })
}
