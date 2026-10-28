// Etsy → local store. Idempotent: rows are keyed by Etsy ids and upserted in one transaction,
// so a failed run changes nothing and a re-run never double-counts.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { getConfig } from './config.js'
import { audit, json, now, parse, setSetting, tx } from './db.js'
import { sanitizeReceipt, sanitizeReview, findPii } from './sanitize.js'
import { fromEtsyMoney } from './money.js'
import { withLock } from './jobs.js'
import { log } from './log.js'

/** The listing fields the app uses. Everything else from Etsy is dropped. */
export function normalizeListing(l) {
  const price = fromEtsyMoney(l.price)
  return {
    listing_id: Number(l.listing_id),
    shop_id: Number(l.shop_id),
    state: l.state,
    title: l.title ?? '',
    description: l.description ?? '',
    tags: Array.isArray(l.tags) ? l.tags : [],
    materials: Array.isArray(l.materials) ? l.materials : [],
    price_minor: price.minor,
    currency: price.currency,
    quantity: Number(l.quantity ?? 0),
    taxonomy_id: l.taxonomy_id ? Number(l.taxonomy_id) : null,
    type: l.listing_type ?? l.type ?? 'physical',
    who_made: l.who_made ?? null,
    when_made: l.when_made ?? null,
    is_supply: !!l.is_supply,
    shipping_profile_id: l.shipping_profile_id ?? null,
    return_policy_id: l.return_policy_id ?? null,
    readiness_state_id: l.readiness_state_id ?? null,
    shop_section_id: l.shop_section_id ?? null,
    num_favorers: l.num_favorers ?? null,
    views: Number.isFinite(Number(l.views)) && l.views !== null ? Number(l.views) : null,
    skus: Array.isArray(l.skus) ? l.skus : [],
    url: l.url ?? null,
    is_personalizable: !!l.is_personalizable,
    should_auto_renew: l.should_auto_renew ?? null,
    created_at: l.original_creation_timestamp || l.creation_timestamp ? new Date((l.original_creation_timestamp ?? l.creation_timestamp) * 1000).toISOString() : null,
    modified_at: l.last_modified_timestamp ? new Date(l.last_modified_timestamp * 1000).toISOString() : null,
    images: (l.images ?? []).map((i) => ({
      listing_image_id: i.listing_image_id,
      rank: i.rank,
      alt_text: i.alt_text ?? null,
      width: i.full_width ?? null,
      height: i.full_height ?? null,
      url: i.url_570xN ?? null,
    })),
    video_count: Array.isArray(l.videos) ? l.videos.length : 0,
  }
}

const hash = (o) => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex')

function flattenTaxonomy(nodes, parentPath = '', out = []) {
  for (const n of nodes ?? []) {
    const p = parentPath ? `${parentPath} › ${n.name}` : n.name
    out.push({ id: n.id, parent_id: n.parent_id ?? null, name: n.name, path: p, level: n.level ?? 0, is_leaf: n.children?.length ? 0 : 1 })
    flattenTaxonomy(n.children, p, out)
  }
  return out
}

async function soft(label, fn, errors) {
  try {
    return await fn()
  } catch (err) {
    errors.push(`${label}: ${err.message}`)
    return null
  }
}

export async function syncEtsy(db, client, { isDemo = false, months = getConfig().etsy.receiptMonths } = {}) {
  return withLock(db, 'etsy-sync', async () => {
    const started = now()
    const syncId = db
      .prepare("INSERT INTO source_syncs (source, started_at, status, scopes) VALUES ('etsy', ?, 'running', ?)")
      .run(started, getConfig().etsy.scopes.join(' ')).lastInsertRowid
    try {
      const me = await client.getMe()
      const shopId = Number(me.shop_id)
      if (!shopId) throw new Error('The authorised Etsy user has no shop.')
      const shop = await client.getShop(shopId)
      const minCreated = Math.floor(Date.now() / 1000) - Math.round(months * 30.44 * 86400)
      const [active, drafts, receipts] = [
        await client.listListings(shopId, 'active'),
        await client.listListings(shopId, 'draft'),
        await client.listReceipts(shopId, { minCreated }),
      ]
      const errors = []
      const refs = {
        section: await soft('sections', () => client.listShopSections(shopId), errors),
        shipping_profile: await soft('shipping profiles', () => client.listShippingProfiles(shopId), errors),
        return_policy: await soft('return policies', () => client.listReturnPolicies(shopId), errors),
        readiness_state: await soft('processing profiles', () => client.listReadinessStates(shopId), errors),
        production_partner: await soft('production partners', () => client.listProductionPartners(shopId), errors),
      }
      const reviews = await soft('reviews', () => client.listReviews(shopId), errors)
      const taxCachedAt = db.prepare("SELECT value FROM settings WHERE key = 'taxonomy_synced_at'").get()
      const taxStale = !taxCachedAt || Date.now() - Date.parse(parse(taxCachedAt.value)) > 7 * 86400_000
      const taxonomy = taxStale ? await soft('taxonomy', () => client.getSellerTaxonomy(), errors) : null

      const listings = [...active, ...drafts].map(normalizeListing)
      const clean = receipts.map(sanitizeReceipt)
      const leaked = findPii(clean)
      if (leaked.length) throw new Error(`Sanitiser left buyer fields: ${leaked.slice(0, 3).join(', ')}`)

      const ts = now()
      const counts = tx(db, () => {
        db.prepare(
          `INSERT INTO shops (shop_id, name, currency, url, is_demo, data_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(shop_id) DO UPDATE SET name=excluded.name, currency=excluded.currency, url=excluded.url,
           is_demo=excluded.is_demo, data_json=excluded.data_json, updated_at=excluded.updated_at`,
        ).run(
          shopId,
          shop.shop_name ?? String(shopId),
          shop.currency_code ?? 'USD',
          shop.url ?? null,
          isDemo ? 1 : 0,
          json({
            title: shop.title ?? null,
            review_average: shop.review_average ?? null,
            review_count: shop.review_count ?? null,
            num_favorers: shop.num_favorers ?? null,
            listing_active_count: shop.listing_active_count ?? null,
          }),
          ts,
        )
        setSetting(db, 'current_shop_id', shopId)

        const seen = new Set()
        const upsertListing = db.prepare(
          `INSERT INTO listings (listing_id, shop_id, state, title, data_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(listing_id) DO UPDATE SET state=excluded.state, title=excluded.title, data_json=excluded.data_json, updated_at=excluded.updated_at`,
        )
        const lastSnap = db.prepare('SELECT data_json FROM listing_snapshots WHERE listing_id = ? ORDER BY id DESC LIMIT 1')
        const addSnap = db.prepare('INSERT INTO listing_snapshots (shop_id, listing_id, captured_at, reason, data_json) VALUES (?, ?, ?, ?, ?)')
        let changed = 0
        for (const l of listings) {
          seen.add(l.listing_id)
          upsertListing.run(l.listing_id, shopId, l.state, l.title, json(l), ts)
          const prev = lastSnap.get(l.listing_id)
          const { views: _v, num_favorers: _f, ...comparable } = l
          const prevComparable = prev ? (({ views: _a, num_favorers: _b, ...rest }) => rest)(parse(prev.data_json, {})) : null
          if (!prev || hash(prevComparable) !== hash(comparable)) {
            addSnap.run(shopId, l.listing_id, ts, prev ? 'sync-changed' : 'sync-first', json(l))
            changed++
          }
        }
        // Listings that disappeared from active/draft are kept for history but marked.
        for (const row of db.prepare("SELECT listing_id FROM listings WHERE shop_id = ? AND state IN ('active','draft')").all(shopId)) {
          if (!seen.has(row.listing_id)) db.prepare("UPDATE listings SET state = 'not_returned' WHERE listing_id = ?").run(row.listing_id)
        }

        const upR = db.prepare(
          `INSERT INTO receipts_sanitized (receipt_id, shop_id, created_at, status, is_paid, subtotal_minor, grandtotal_minor, discount_minor, shipping_minor, currency)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(receipt_id) DO UPDATE SET status=excluded.status, is_paid=excluded.is_paid,
           subtotal_minor=excluded.subtotal_minor, grandtotal_minor=excluded.grandtotal_minor, discount_minor=excluded.discount_minor,
           shipping_minor=excluded.shipping_minor`,
        )
        const upT = db.prepare(
          `INSERT INTO receipt_transactions (transaction_id, shop_id, receipt_id, listing_id, title, sku, quantity, price_minor, currency, created_at, is_digital)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(transaction_id) DO UPDATE SET quantity=excluded.quantity, price_minor=excluded.price_minor,
           title=excluded.title, sku=excluded.sku`,
        )
        for (const r of clean) {
          upR.run(r.receipt_id, shopId, r.created_at, r.status, r.is_paid, r.subtotal_minor, r.grandtotal_minor, r.discount_minor, r.shipping_minor, r.currency)
          for (const t of r.transactions) {
            upT.run(t.transaction_id, shopId, r.receipt_id, t.listing_id, t.title, t.sku, t.quantity, t.price_minor, t.currency, t.created_at, t.is_digital)
          }
        }

        for (const [kind, list] of Object.entries(refs)) {
          if (!list) continue
          db.prepare('DELETE FROM shop_refs WHERE shop_id = ? AND kind = ?').run(shopId, kind)
          const ins = db.prepare('INSERT OR REPLACE INTO shop_refs (shop_id, kind, ref_id, name, data_json) VALUES (?, ?, ?, ?, ?)')
          for (const x of list) {
            const id = x.shop_section_id ?? x.shipping_profile_id ?? x.return_policy_id ?? x.readiness_state_id ?? x.production_partner_id
            const name = x.title ?? x.partner_name ?? x.readiness_state ?? (x.return_deadline ? `Returns within ${x.return_deadline} days` : `#${id}`)
            ins.run(shopId, kind, id, name, json(x))
          }
        }
        if (reviews) {
          db.prepare('DELETE FROM reviews WHERE shop_id = ?').run(shopId)
          const ins = db.prepare('INSERT INTO reviews (id, shop_id, listing_id, rating, created_at) VALUES (?, ?, ?, ?, ?)')
          reviews.map(sanitizeReview).forEach((rv, i) => ins.run(`${shopId}-${i}`, shopId, rv.listing_id, rv.rating, rv.created_at))
        }
        if (taxonomy?.length) {
          db.exec('DELETE FROM taxonomy_nodes')
          const ins = db.prepare('INSERT OR REPLACE INTO taxonomy_nodes (id, parent_id, name, path, level, is_leaf) VALUES (?, ?, ?, ?, ?, ?)')
          for (const n of flattenTaxonomy(taxonomy)) ins.run(n.id, n.parent_id, n.name, n.path, n.level, n.is_leaf)
          setSetting(db, 'taxonomy_synced_at', ts)
        }
        return { listings: listings.length, active: active.length, drafts: drafts.length, receipts: clean.length, changed_listings: changed, warnings: errors }
      })

      const rangeStart = new Date(minCreated * 1000).toISOString()
      db.prepare("UPDATE source_syncs SET finished_at=?, status='ok', shop_id=?, range_start=?, range_end=?, counts_json=? WHERE id=?").run(
        now(), shopId, rangeStart, ts, json(counts), syncId,
      )
      writeSnapshot({ shopId, isDemo, pulledAt: ts, rangeStart, shop, listings, receipts: clean })
      audit(db, 'etsy.sync', { actor: 'sync', shopId, detail: counts })
      return { shopId, ...counts }
    } catch (err) {
      db.prepare("UPDATE source_syncs SET finished_at=?, status='failed', error=? WHERE id=?").run(now(), err.message.slice(0, 500), syncId)
      log.error('Etsy sync failed; previous data kept', { error: err.message })
      throw err
    }
  })
}

/** Dated, sanitised raw snapshot for audit and recovery. Written atomically. Contains no credentials. */
function writeSnapshot({ shopId, isDemo, pulledAt, rangeStart, shop, listings, receipts }) {
  const dir = getConfig().paths.raw
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `etsy-${pulledAt.slice(0, 10)}.json`)
  const body = {
    meta: {
      source: isDemo ? 'demo (fictional)' : 'Etsy Open API v3',
      pulled_at: pulledAt,
      shop_id: shopId,
      scopes: getConfig().etsy.scopes,
      receipt_range: { start: rangeStart, end: pulledAt },
      privacy: 'Receipts reduced to an allow-list; buyer names, emails, ids, addresses, messages and personalisation removed.',
    },
    shop: { shop_id: shopId, shop_name: shop.shop_name, currency_code: shop.currency_code },
    listings,
    receipts,
  }
  fs.writeFileSync(file + '.tmp', JSON.stringify(body))
  fs.renameSync(file + '.tmp', file)
}
