// Shop metrics computed only from synchronised data. Every result carries the window it covers.
import { parse } from './db.js'

const DAY = 86400_000
// A paid order: Etsy marks it paid and it was not cancelled or fully refunded. Partial refunds stay (gross).
const PAID = "is_paid = 1 AND COALESCE(status,'') NOT IN ('canceled','cancelled','fully refunded')"

export const iso = (ms) => new Date(ms).toISOString()

export function dataWindow(db, shopId) {
  const r = db.prepare(`SELECT MIN(created_at) first, MAX(created_at) last, COUNT(*) n FROM receipts_sanitized WHERE shop_id = ?`).get(shopId)
  const sync = db.prepare("SELECT range_start, range_end, finished_at FROM source_syncs WHERE source='etsy' AND status='ok' AND shop_id=? ORDER BY id DESC LIMIT 1").get(shopId)
  return {
    first_receipt: r.first,
    last_receipt: r.last,
    receipts: r.n,
    requested_from: sync?.range_start ?? null,
    synced_at: sync?.finished_at ?? null,
    label: r.first ? `Synced orders ${r.first.slice(0, 10)} → ${(sync?.range_end ?? r.last).slice(0, 10)}` : 'No orders synced',
  }
}

export function windowMetrics(db, shopId, fromMs, toMs) {
  const from = iso(fromMs)
  const to = iso(toMs)
  const o = db
    .prepare(`SELECT COUNT(*) orders, COALESCE(SUM(subtotal_minor),0) revenue, COALESCE(SUM(discount_minor),0) discounts, MAX(currency) currency
              FROM receipts_sanitized WHERE shop_id = ? AND created_at >= ? AND created_at < ? AND ${PAID}`)
    .get(shopId, from, to)
  const u = db
    .prepare(`SELECT COALESCE(SUM(t.quantity),0) units FROM receipt_transactions t JOIN receipts_sanitized r ON r.receipt_id = t.receipt_id
              WHERE r.shop_id = ? AND r.created_at >= ? AND r.created_at < ? AND ${PAID.replace(/is_paid|status/g, (m) => 'r.' + m)}`)
    .get(shopId, from, to)
  return {
    from,
    to,
    orders: o.orders,
    revenue_minor: o.revenue,
    discounts_minor: o.discounts,
    units: u.units,
    aov_minor: o.orders ? Math.round(o.revenue / o.orders) : 0,
    units_per_order: o.orders ? Math.round((u.units / o.orders) * 100) / 100 : 0,
    currency: o.currency,
  }
}

const pct = (a, b) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null)

export function compare30(db, shopId, nowMs = Date.now()) {
  const cur = windowMetrics(db, shopId, nowMs - 30 * DAY, nowMs)
  const prev = windowMetrics(db, shopId, nowMs - 60 * DAY, nowMs - 30 * DAY)
  return {
    current: cur,
    previous: prev,
    change: {
      revenue: pct(cur.revenue_minor, prev.revenue_minor),
      orders: pct(cur.orders, prev.orders),
      units: pct(cur.units, prev.units),
      aov: pct(cur.aov_minor, prev.aov_minor),
    },
  }
}

export function monthlyTrend(db, shopId) {
  return db
    .prepare(`SELECT substr(created_at,1,7) month, COUNT(*) orders, SUM(subtotal_minor) revenue_minor
              FROM receipts_sanitized WHERE shop_id = ? AND ${PAID} GROUP BY month ORDER BY month`)
    .all(shopId)
    .map((m) => {
      const u = db
        .prepare(`SELECT COALESCE(SUM(t.quantity),0) units FROM receipt_transactions t JOIN receipts_sanitized r ON r.receipt_id=t.receipt_id
                  WHERE r.shop_id=? AND substr(r.created_at,1,7)=? AND r.is_paid=1 AND COALESCE(r.status,'') NOT IN ('canceled','cancelled','fully refunded')`)
        .get(shopId, m.month)
      return { ...m, units: u.units }
    })
}

/** Per-listing units/revenue/orders in a window (item price × quantity). */
export function listingSales(db, shopId, fromMs, toMs = Date.now()) {
  const rows = db
    .prepare(`SELECT t.listing_id, SUM(t.quantity) units, SUM(t.quantity * t.price_minor) revenue_minor, COUNT(DISTINCT t.receipt_id) orders,
              MAX(t.title) title, MAX(r.created_at) last_sold
              FROM receipt_transactions t JOIN receipts_sanitized r ON r.receipt_id = t.receipt_id
              WHERE r.shop_id = ? AND r.created_at >= ? AND r.created_at < ? AND r.is_paid = 1
              AND COALESCE(r.status,'') NOT IN ('canceled','cancelled','fully refunded') GROUP BY t.listing_id`)
    .all(shopId, iso(fromMs), iso(toMs))
  return new Map(rows.map((r) => [r.listing_id, r]))
}

export function activeListings(db, shopId) {
  return db
    .prepare("SELECT data_json FROM listings WHERE shop_id = ? AND state = 'active'")
    .all(shopId)
    .map((r) => parse(r.data_json))
}

export function topProducts(db, shopId, days, nowMs = Date.now(), limit = 10) {
  const sales = listingSales(db, shopId, nowMs - days * DAY, nowMs)
  const titles = new Map(activeListings(db, shopId).map((l) => [l.listing_id, l]))
  return [...sales.values()]
    .sort((a, b) => b.revenue_minor - a.revenue_minor)
    .slice(0, limit)
    .map((s) => ({ ...s, title: titles.get(s.listing_id)?.title ?? s.title, active: titles.has(s.listing_id) }))
}

/** Listings whose last-90-day units fell versus the prior 90 days. */
export function decliningListings(db, shopId, nowMs = Date.now(), limit = 5) {
  const cur = listingSales(db, shopId, nowMs - 90 * DAY, nowMs)
  const prev = listingSales(db, shopId, nowMs - 180 * DAY, nowMs - 90 * DAY)
  const titles = new Map(activeListings(db, shopId).map((l) => [l.listing_id, l.title]))
  return [...prev.values()]
    .filter((p) => titles.has(p.listing_id) && p.units >= 4)
    .map((p) => {
      const c = cur.get(p.listing_id)?.units ?? 0
      return { listing_id: p.listing_id, title: titles.get(p.listing_id), prior_units: p.units, units: c, change: pct(c, p.units) }
    })
    .filter((x) => x.change !== null && x.change <= -25)
    .sort((a, b) => a.change - b.change)
    .slice(0, limit)
}

export function newListingPerformance(db, shopId, nowMs = Date.now(), days = 120) {
  const since = nowMs - days * DAY
  const sales = listingSales(db, shopId, since, nowMs)
  return activeListings(db, shopId)
    .filter((l) => l.created_at && Date.parse(l.created_at) >= since)
    .map((l) => ({
      listing_id: l.listing_id,
      title: l.title,
      created_at: l.created_at,
      units: sales.get(l.listing_id)?.units ?? 0,
      revenue_minor: sales.get(l.listing_id)?.revenue_minor ?? 0,
      favorites: l.num_favorers,
    }))
    .sort((a, b) => b.revenue_minor - a.revenue_minor)
}

export function reviewSummary(db, shopId, shop) {
  const r = db.prepare('SELECT COUNT(*) n, AVG(rating) avg FROM reviews WHERE shop_id = ?').get(shopId)
  return {
    shop_average: shop?.data?.review_average ?? null,
    shop_count: shop?.data?.review_count ?? null,
    synced_count: r.n,
    synced_average: r.avg ? Math.round(r.avg * 100) / 100 : null,
  }
}

export function performance(db, shop, nowMs = Date.now()) {
  const id = shop.shop_id
  const listings = activeListings(db, id)
  return {
    window: dataWindow(db, id),
    compare: compare30(db, id, nowMs),
    monthly: monthlyTrend(db, id),
    top90: topProducts(db, id, 90, nowMs),
    top365: topProducts(db, id, 365, nowMs),
    declining: decliningListings(db, id, nowMs),
    new_listings: newListingPerformance(db, id, nowMs),
    active_listings: listings.length,
    favorites: listings.reduce((s, l) => s + (l.num_favorers ?? 0), 0),
    reviews: reviewSummary(db, id, shop),
    conversion: {
      available: false,
      note: "Etsy's Open API does not expose shop visits, so conversion rate can't be calculated here. Use Shop Stats for visits.",
    },
  }
}
