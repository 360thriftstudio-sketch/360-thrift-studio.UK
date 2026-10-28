// Screen-shaped payloads for the dashboard. Nothing here exposes raw receipts or credentials.
import { parse } from './db.js'
import { activeListings, compare30, dataWindow, listingSales, performance } from './analytics.js'
import { auditListing, recRow } from './seo.js'
import { keywordGaps, latestKeywords } from './research.js'
import { listDrafts } from './drafts.js'
import { changeOutcomes } from './listing-writes.js'

const DAY = 86400_000

export function sourceStatus(db, shop) {
  const last = (source, okOnly) =>
    db.prepare(`SELECT * FROM source_syncs WHERE source ${source === 'research' ? "!= 'etsy'" : "= 'etsy'"} ${okOnly ? "AND status='ok'" : ''} AND (shop_id = ? OR shop_id IS NULL) ORDER BY id DESC LIMIT 1`).get(shop.shop_id)
  const shape = (ok, latest, staleHours) => ({
    last_success: ok?.finished_at ?? null,
    last_status: latest?.status ?? null,
    last_error: latest?.status === 'failed' ? latest.error : null,
    provider: ok?.source ?? null,
    stale: !ok || Date.now() - Date.parse(ok.finished_at) > staleHours * 3600_000,
    counts: parse(ok?.counts_json, null),
  })
  return {
    etsy: shape(last('etsy', true), last('etsy', false), 24),
    research: shape(last('research', true), last('research', false), 24 * 7),
    insights: db.prepare('SELECT MAX(captured_at) at, COUNT(*) n FROM marketplace_insights_imports WHERE shop_id=?').get(shop.shop_id),
  }
}

function researchKeywordList(db, shop) {
  return latestKeywords(db, shop.shop_id).map((k) => k.keyword)
}

export function homeView(db, shop) {
  const cmp = compare30(db, shop.shop_id)
  const recs = db
    .prepare("SELECT r.*, l.title FROM seo_recommendations r JOIN listings l ON l.listing_id = r.listing_id WHERE r.shop_id=? AND r.status IN ('suggested','staged') AND l.state='active' ORDER BY r.priority DESC LIMIT 40")
    .all(shop.shop_id)
    .map(recRow)
  const fixNext = []
  const seen = new Set()
  for (const r of recs) {
    if (seen.has(r.listing_id)) continue
    seen.add(r.listing_id)
    fixNext.push({ id: r.id, listing_id: r.listing_id, title: r.title, issue: r.issue_type, reason: r.reason, impact: r.impact, priority: r.priority })
    if (fixNext.length >= 3) break
  }
  const gaps = keywordGaps(db, shop).filter((g) => g.mode !== 'optimize')
  const makeNext = gaps.slice(0, 3).map((g) => ({ keyword: g.keyword, score: g.score, confidence: g.confidence, angle: g.angle }))
  const drafts = listDrafts(db, shop.shop_id)
  const waiting = drafts.filter((d) => !['published'].includes(d.status))
  const stale = waiting.filter((d) => Date.now() - Date.parse(d.updated_at) > 14 * DAY)
  return {
    metrics: {
      revenue: { value: cmp.current.revenue_minor, change: cmp.change.revenue, currency: shop.currency },
      orders: { value: cmp.current.orders, change: cmp.change.orders },
      conversion: { value: null, note: 'Visits are not in the Etsy API' },
      active_listings: { value: activeListings(db, shop.shop_id).length },
    },
    window: { from: cmp.current.from, to: cmp.current.to, label: 'Last 30 days vs previous 30' },
    fix_next: fixNext,
    make_next: makeNext,
    drafts: {
      review: waiting.filter((d) => ['ready_to_publish', 'needs_attention', 'validation_failed'].includes(d.status)).map((d) => ({ id: d.id, title: d.fields.title || 'Untitled draft', status: d.status })),
      in_progress: waiting.length,
      stale: stale.length,
    },
    sources: sourceStatus(db, shop),
  }
}

export function optimizeList(db, shop) {
  const listings = activeListings(db, shop.shop_id)
  const sales = listingSales(db, shop.shop_id, Date.now() - 365 * DAY)
  const recs = db.prepare("SELECT * FROM seo_recommendations WHERE shop_id=? AND status IN ('suggested','staged')").all(shop.shop_id).map(recRow)
  const byListing = new Map()
  for (const r of recs) (byListing.get(r.listing_id) ?? byListing.set(r.listing_id, []).get(r.listing_id)).push(r)
  const research = researchKeywordList(db, shop)
  const taxonomy = new Map(db.prepare('SELECT id, is_leaf, path FROM taxonomy_nodes').all().map((t) => [t.id, t]))
  return listings.map((l) => {
    const rs = (byListing.get(l.listing_id) ?? []).sort((a, b) => b.priority - a.priority)
    const a = auditListing(l, { sales: sales.get(l.listing_id), research, taxonomy })
    const top = rs[0]
    const priority = rs.reduce((s, r) => s + r.priority, 0)
    return {
      listing_id: l.listing_id,
      title: l.title,
      type: l.type,
      score: a.score,
      impact: top?.impact ?? 'none',
      priority: Math.round(priority * 10) / 10,
      main_issue: top ? top.issue_type : null,
      main_reason: top?.reason ?? null,
      units_12m: sales.get(l.listing_id)?.units ?? 0,
      revenue_12m_minor: sales.get(l.listing_id)?.revenue_minor ?? 0,
      hero: rs.some((r) => r.hero),
      open: rs.length,
      staged: rs.filter((r) => r.status === 'staged').length,
      image: l.images?.[0]?.url ?? null,
    }
  })
}

export function optimizeDetail(db, shop, listingId) {
  const row = db.prepare('SELECT data_json FROM listings WHERE listing_id=? AND shop_id=?').get(Number(listingId), shop.shop_id)
  if (!row) return null
  const l = parse(row.data_json)
  const sales = listingSales(db, shop.shop_id, Date.now() - 365 * DAY).get(l.listing_id)
  const taxonomy = new Map(db.prepare('SELECT id, is_leaf, path FROM taxonomy_nodes').all().map((t) => [t.id, t]))
  const a = auditListing(l, { sales, research: researchKeywordList(db, shop), taxonomy })
  const recs = db.prepare('SELECT * FROM seo_recommendations WHERE shop_id=? AND listing_id=? ORDER BY priority DESC').all(shop.shop_id, l.listing_id).map(recRow)
  const changes = db.prepare('SELECT * FROM recommendation_changes WHERE listing_id=? ORDER BY id DESC LIMIT 20').all(l.listing_id).map((c) => ({ ...c, old_value: parse(c.old_value), new_value: parse(c.new_value) }))
  return {
    listing: { listing_id: l.listing_id, title: l.title, tags: l.tags, description: l.description, type: l.type, url: l.url, images: l.images.length, taxonomy: taxonomy.get(l.taxonomy_id)?.path ?? l.taxonomy_id },
    score: a.score,
    components: a.components,
    evidence: a.evidence,
    unavailable: a.unavailable,
    recommendations: recs,
    changes,
  }
}

export function researchView(db, shop, q = {}) {
  let rows = keywordGaps(db, shop)
  const text = String(q.q ?? '').toLowerCase().trim()
  if (text) rows = rows.filter((r) => r.keyword.includes(text) || (r.theme ?? '').toLowerCase().includes(text))
  if (q.theme) rows = rows.filter((r) => r.theme === q.theme)
  if (q.min_score) rows = rows.filter((r) => r.score >= Number(q.min_score))
  const rank = { exploratory: 0, medium: 1, high: 2 }
  if (q.min_confidence) rows = rows.filter((r) => rank[r.confidence] >= rank[q.min_confidence])
  if (q.mode === 'new') rows = rows.filter((r) => r.mode !== 'optimize')
  if (q.mode === 'optimize') rows = rows.filter((r) => r.catalog_matches > 0)
  if (q.source === 'insights') rows = rows.filter((r) => r.official)
  if (q.source === 'krafie') rows = rows.filter((r) => r.krafie)
  const themes = [...new Set(keywordGaps(db, shop).map((r) => r.theme).filter(Boolean))].sort()
  return { rows, themes, top: rows.filter((r) => r.mode !== 'optimize').slice(0, 3), sources: sourceStatus(db, shop) }
}

export function performanceView(db, shop) {
  return { ...performance(db, shop), outcomes: changeOutcomes(db, shop.shop_id), window_note: dataWindow(db, shop.shop_id).label }
}
