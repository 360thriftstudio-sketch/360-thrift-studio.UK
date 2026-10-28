// Listing audit: transparent components, field-level recommendations, sales-weighted priority.
// Thresholds marked HEURISTIC are configurable cleanup guidance, not Etsy ranking rules.
import crypto from 'node:crypto'
import { ETSY_LIMITS } from './config.js'
import { audit, json, now, parse, tx } from './db.js'
import { activeListings, listingSales } from './analytics.js'
import { tokens, words, phraseMatcher, clamp, titleCase, STOP_WORDS } from './text.js'

export const HEURISTICS = {
  titleMaxWords: 15, // HEURISTIC: buyer-readable titles; Etsy allows 140 characters
  minImages: 5, // HEURISTIC
  primaryImageMinPx: 2000, // HEURISTIC: Etsy recommends ≥2000px on the shortest side
  descriptionMinChars: 160, // HEURISTIC
  maxTitleSeparators: 3, // HEURISTIC: many | , – segments suggests keyword stuffing
}

const SOURCES = {
  etsy: 'Etsy listing data',
  etsyRule: 'Etsy listing rule',
  heuristic: 'Studio heuristic',
  sales: 'Your Etsy orders',
  research: 'Krafie research (estimate)',
  insights: 'Etsy Marketplace Insights (imported)',
}

const SEGMENT_SPLIT = /\s*[|,–—:;]\s*|\s+-\s+/

export function titleSegments(title) {
  return String(title ?? '').split(SEGMENT_SPLIT).map((s) => s.trim()).filter(Boolean)
}

/** Clear product name first, duplicate segments removed, trimmed to the word heuristic. */
export function proposeTitle(title) {
  const segs = titleSegments(title)
  const kept = []
  const seenTokens = new Set()
  for (const s of segs) {
    const t = tokens(s)
    const novel = t.filter((x) => !seenTokens.has(x))
    if (!t.length || novel.length === 0) continue // fully repeated segment
    kept.push(s)
    t.forEach((x) => seenTokens.add(x))
  }
  // Within the kept segments, drop later repeats of a content word ("… Candle … Candle").
  const used = new Set()
  const deduped = kept
    .map((seg) =>
      seg
        .split(/\s+/)
        .filter((w) => {
          const t = tokens(w)[0]
          if (!t) return true
          if (used.has(t)) return false
          used.add(t)
          return true
        })
        .join(' '),
    )
    .filter((seg) => tokens(seg).length)
  const out = []
  let count = 0
  for (const s of deduped) {
    const w = s.split(/\s+/)
    if (out.length && count + w.length > HEURISTICS.titleMaxWords) break
    out.push(w.slice(0, HEURISTICS.titleMaxWords).join(' '))
    count += w.length
  }
  let proposed = out.join(', ').replace(/\s+(and|or|with|for|of|the|a|an|&)$/i, '')
  if (proposed.length > ETSY_LIMITS.titleMaxChars) proposed = proposed.slice(0, ETSY_LIMITS.titleMaxChars).replace(/[\s,]+\S*$/, '')
  return proposed
}

export function repeatedWords(title) {
  const counts = {}
  for (const t of tokens(title)) counts[t] = (counts[t] ?? 0) + 1
  return Object.entries(counts).filter(([, n]) => n >= 3).map(([w]) => w)
}

const tagOk = (t) => t.length > 0 && t.length <= ETSY_LIMITS.tagMaxChars && /^[\p{L}\p{N}\s'’\-™©®]+$/u.test(t)

/** Fill to 13 tags from the listing's own phrases and matching research keywords; drop near-duplicates. */
export function proposeTags(listing, researchKeywords = []) {
  const existing = []
  const keys = new Set()
  const key = (t) => tokens(t).sort().join(' ')
  for (const t of listing.tags ?? []) {
    const k = key(t)
    if (!k || keys.has(k)) continue
    keys.add(k)
    existing.push(t.toLowerCase())
  }
  const listingTokens = new Set(tokens(`${listing.title} ${(listing.tags ?? []).join(' ')}`))
  const candidates = [
    ...researchKeywords.filter((k) => phraseMatcher(k)(listingTokens)).map((k) => k.toLowerCase()),
    ...titleSegments(listing.title).map((s) => s.toLowerCase()),
    ...(listing.materials ?? []).map((m) => String(m).toLowerCase()),
  ]
  // A few two-word phrases from the lead title segment. Capped: empty slots beat filler tags.
  const w = words(titleSegments(listing.title)[0] ?? '')
  let pairs = 0
  for (let i = 0; i < w.length - 1 && pairs < 4; i++) {
    const [a, b] = [w[i], w[i + 1]]
    if (STOP_WORDS.has(a) || STOP_WORDS.has(b) || /\d/.test(a + b)) continue
    candidates.push(`${a} ${b}`)
    pairs++
  }
  const out = [...existing]
  for (const c of candidates) {
    if (out.length >= ETSY_LIMITS.tagsMax) break
    const t = c.trim().replace(/\s+/g, ' ')
    const k = key(t)
    if (!tagOk(t) || !k || keys.has(k) || tokens(t).length === 0) continue
    keys.add(k)
    out.push(t)
  }
  return out.slice(0, ETSY_LIMITS.tagsMax)
}

export function tagOverlaps(tags = []) {
  const sets = tags.map((t) => new Set(tokens(t)))
  const dupes = []
  for (let i = 0; i < tags.length; i++) {
    for (let j = 0; j < tags.length; j++) {
      if (i === j || !sets[i].size) continue
      const same = sets[i].size === sets[j].size && [...sets[i]].every((x) => sets[j].has(x))
      if (same && j < i) dupes.push(tags[i])
    }
  }
  return [...new Set(dupes)]
}

function firstSentence(s) {
  return String(s ?? '').split(/(?<=[.!?])\s|\n/)[0]?.trim() ?? ''
}

/**
 * Audit one listing. ctx: { sales: {units, revenue_minor, orders}, maxRevenue, hero, research: [keywords],
 * taxonomy: Map<id,{is_leaf, path}>, freshnessDays }
 */
export function auditListing(l, ctx = {}) {
  const issues = []
  const add = (i) => issues.push({ automatable: false, confidence: 0.7, ...i })
  const titleWords = String(l.title).split(/\s+/).filter(Boolean)
  const isPhysical = l.type !== 'download'

  // --- Etsy visibility requirements ---
  const vis = []
  const tax = l.taxonomy_id ? ctx.taxonomy?.get(l.taxonomy_id) : null
  if (!l.taxonomy_id) {
    vis.push(0)
    add({ issue_type: 'category_missing', field: 'taxonomy_id', current: null, proposed: 'Choose the most specific category', reason: 'Listings without a category are hard for Etsy to place in search and browse.', source: SOURCES.etsyRule, severity: 1, impact: 'high', confidence: 0.9 })
  } else if (tax && !tax.is_leaf) {
    vis.push(50)
    add({ issue_type: 'category_broad', field: 'taxonomy_id', current: tax.path, proposed: `A subcategory of ${tax.path}`, reason: 'A more specific category unlocks relevant attributes and browse placement.', source: SOURCES.etsy, severity: 0.6, impact: 'medium', confidence: 0.75 })
  } else vis.push(100)

  const tagCount = (l.tags ?? []).length
  vis.push(clamp((tagCount / ETSY_LIMITS.tagsMax) * 100))
  if (tagCount < ETSY_LIMITS.tagsMax) {
    const proposed = proposeTags(l, ctx.research ?? [])
    if (proposed.length > tagCount) {
      add({ issue_type: 'tags_unused', field: 'tags', current: l.tags, proposed, reason: `Uses ${tagCount} of ${ETSY_LIMITS.tagsMax} tags; each unused tag is a missed search phrase.`, source: SOURCES.etsy, severity: tagCount < 8 ? 0.9 : 0.6, impact: tagCount < 8 ? 'high' : 'medium', confidence: 0.85, automatable: true })
    }
  }
  const imgCount = (l.images ?? []).length
  vis.push(imgCount === 0 ? 0 : 100)
  if (imgCount === 0) add({ issue_type: 'images_missing', field: 'images', current: 0, proposed: 'Add photos or mockups', reason: 'A listing needs photos to be shown and to convert.', source: SOURCES.etsyRule, severity: 1, impact: 'high', confidence: 0.95 })
  if (isPhysical) {
    vis.push(l.shipping_profile_id ? 100 : 0)
    if (!l.shipping_profile_id) add({ issue_type: 'shipping_missing', field: 'shipping_profile_id', current: null, proposed: 'Assign a shipping profile', reason: 'Physical listings need shipping set; missing or unclear shipping costs buyers.', source: SOURCES.etsyRule, severity: 0.9, impact: 'high', confidence: 0.8 })
    if (!l.return_policy_id) add({ issue_type: 'returns_missing', field: 'return_policy_id', current: null, proposed: 'Attach a return policy', reason: 'A visible return policy reassures buyers.', source: SOURCES.etsy, severity: 0.4, impact: 'low', confidence: 0.6 })
  }

  // --- Keyword coverage ---
  const titleTok = new Set(tokens(titleSegments(l.title)[0] ?? l.title))
  const tagTok = new Set(tokens((l.tags ?? []).join(' ')))
  const covered = [...titleTok].filter((t) => tagTok.has(t)).length
  const cov = [titleTok.size ? clamp((covered / titleTok.size) * 100) : 0]
  // A research phrase is relevant when the listing's own text (incl. description and materials) supports
  // every word of it; it is covered when the searchable fields (title + tags) contain it.
  const allTok = new Set([...tokens(l.title), ...tagTok])
  const docTok = new Set([...allTok, ...tokens(l.description), ...tokens((l.materials ?? []).join(' '))])
  const relevant = (ctx.research ?? []).filter((k) => phraseMatcher(k)(docTok))
  const matched = relevant.filter((k) => phraseMatcher(k)(allTok))
  if (relevant.length) cov.push(clamp((matched.length / relevant.length) * 100))
  const missingKeywords = relevant.filter((k) => !matched.includes(k)).slice(0, 5)

  // --- Clarity ---
  const clar = []
  const reps = repeatedWords(l.title)
  const segs = titleSegments(l.title).length
  const titleIssue = titleWords.length > HEURISTICS.titleMaxWords || reps.length > 0 || segs > HEURISTICS.maxTitleSeparators + 1
  clar.push(titleIssue ? 40 : 100)
  if (titleIssue) {
    const proposed = proposeTitle(l.title)
    if (proposed && proposed !== l.title) {
      const why = reps.length
        ? `Repeats “${reps.join('”, “')}”; lead with one clear product name.`
        : titleWords.length > HEURISTICS.titleMaxWords
          ? `${titleWords.length} words; a clear name under ${HEURISTICS.titleMaxWords} words reads better.`
          : 'Many keyword fragments; buyers read the first few words.'
      add({ issue_type: 'title_clarity', field: 'title', current: l.title, proposed, reason: why, source: SOURCES.heuristic, severity: 0.7, impact: 'medium', confidence: 0.65, automatable: true })
    }
  }
  const desc = String(l.description ?? '')
  const opening = firstSentence(desc)
  const mainTok = tokens(titleSegments(l.title)[0] ?? '')
  const openingOk = desc.length >= HEURISTICS.descriptionMinChars && mainTok.some((t) => new Set(tokens(opening)).has(t))
  clar.push(openingOk ? 100 : desc.length ? 50 : 0)
  if (!openingOk) {
    const name = titleCase(titleSegments(l.title)[0] ?? l.title)
    const lead = `${name}${l.type === 'download' ? ' — instant digital download.' : '.'}`
    const proposed = desc ? `${lead}\n\n${desc}` : `${lead}\n\nWhat you get:\n- \n\nHow to use:\n- `
    add({ issue_type: 'description_opening', field: 'description', current: desc, proposed, reason: desc ? 'The first sentence should say plainly what the item is.' : 'The description is empty.', source: SOURCES.heuristic, severity: desc ? 0.4 : 0.8, impact: desc ? 'low' : 'medium', confidence: 0.6, automatable: true })
  }
  const missingAlt = (l.images ?? []).filter((i) => !i.alt_text).length
  if (imgCount) clar.push(clamp(((imgCount - missingAlt) / imgCount) * 100))
  if (missingAlt) add({ issue_type: 'alt_text', field: 'images.alt_text', current: `${missingAlt} of ${imgCount} images without alt text`, proposed: `Describe each photo, e.g. “${titleSegments(l.title)[0] ?? l.title}”`.slice(0, ETSY_LIMITS.altTextMaxChars), reason: 'Alt text helps screen-reader buyers and describes the photo to search.', source: SOURCES.etsy, severity: 0.3, impact: 'low', confidence: 0.6 })
  if (imgCount && imgCount < HEURISTICS.minImages) add({ issue_type: 'images_few', field: 'images', current: imgCount, proposed: `${HEURISTICS.minImages}+ images: mockups, scale, detail, what's included`, reason: 'More angles answer buyer questions before they ask.', source: SOURCES.heuristic, severity: 0.5, impact: 'medium', confidence: 0.6 })
  const primary = (l.images ?? []).find((i) => i.rank === 1) ?? l.images?.[0]
  if (primary?.width && Math.min(primary.width, primary.height ?? primary.width) < HEURISTICS.primaryImageMinPx) add({ issue_type: 'image_resolution', field: 'images', current: `${primary.width}×${primary.height}px primary`, proposed: `≥${HEURISTICS.primaryImageMinPx}px on the shortest side`, reason: 'Low-resolution primary images look soft when buyers zoom.', source: SOURCES.heuristic, severity: 0.3, impact: 'low', confidence: 0.55 })
  if (!l.video_count) add({ issue_type: 'video_missing', field: 'videos', current: 0, proposed: 'Add a 5–15s listing video', reason: 'A short video shows scale and use.', source: SOURCES.heuristic, severity: 0.2, impact: 'low', confidence: 0.5 })
  if (isPhysical && !(l.materials ?? []).length) add({ issue_type: 'materials_missing', field: 'materials', current: [], proposed: 'List the main materials', reason: 'Materials answer a common buyer question and add descriptive terms.', source: SOURCES.etsy, severity: 0.3, impact: 'low', confidence: 0.55 })
  if (!(l.skus ?? []).length) add({ issue_type: 'sku_missing', field: 'sku', current: null, proposed: 'Add a SKU', reason: 'SKUs make sales reports and inventory reliable (operational, not SEO).', source: SOURCES.heuristic, severity: 0.1, impact: 'low', confidence: 0.9 })

  const avg = (a) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : null)
  const components = {
    visibility: { score: avg(vis), label: 'Etsy visibility requirements', source: SOURCES.etsy },
    keywords: { score: avg(cov), label: 'Keyword coverage', source: relevant.length ? `${SOURCES.etsy} + ${SOURCES.research}` : SOURCES.etsy, missing: missingKeywords },
    clarity: { score: avg(clar), label: 'Listing clarity', source: SOURCES.heuristic },
  }
  const score = avg(Object.values(components).map((c) => c.score).filter((x) => x !== null))

  // --- Priority = severity × sales potential × confidence × freshness ---
  const s = ctx.sales ?? { units: 0, revenue_minor: 0, orders: 0 }
  const salesPotential = 0.35 + 0.65 * (ctx.maxRevenue ? Math.sqrt(s.revenue_minor / ctx.maxRevenue) : 0)
  const fd = ctx.freshnessDays ?? 0
  const freshness = fd <= 2 ? 1 : fd <= 7 ? 0.85 : fd <= 30 ? 0.6 : 0.4
  for (const i of issues) {
    i.priority = Math.round(i.severity * salesPotential * i.confidence * freshness * 1000) / 10
    i.hero = !!ctx.hero
    if (ctx.hero && ['title', 'description'].includes(i.field)) i.reason += ' Proven listing — change cautiously and compare results.'
  }
  issues.sort((a, b) => b.priority - a.priority)

  return {
    listing_id: l.listing_id,
    score,
    components,
    evidence: {
      units_12m: s.units,
      revenue_12m_minor: s.revenue_minor,
      orders_12m: s.orders,
      favorites: l.num_favorers,
      views: l.views,
      hero: !!ctx.hero,
      source: SOURCES.sales,
    },
    unavailable: [
      'Search impressions and ranking position (not in Etsy Open API)',
      'Visits and conversion rate (Shop Stats only)',
      ...(l.views === null || l.views === undefined ? ['Listing views'] : []),
    ],
    issues,
  }
}

const fingerprint = (listingId, i) =>
  'rec_' + crypto.createHash('sha1').update(`${listingId}|${i.issue_type}|${i.field}|${JSON.stringify(i.proposed)}`).digest('hex').slice(0, 16)

/** Re-audit all active listings, upserting recommendations while keeping operator decisions. */
export function runAudit(db, shop, { research = [], nowMs = Date.now() } = {}) {
  const listings = activeListings(db, shop.shop_id)
  const sales = listingSales(db, shop.shop_id, nowMs - 365 * 86400_000, nowMs)
  const revenues = [...sales.values()].map((s) => s.revenue_minor).sort((a, b) => b - a)
  const maxRevenue = revenues[0] ?? 0
  const heroCut = revenues[Math.max(0, Math.min(2, Math.floor(revenues.length * 0.1)))] ?? Infinity
  const taxonomy = new Map(db.prepare('SELECT id, is_leaf, path FROM taxonomy_nodes').all().map((t) => [t.id, t]))
  const synced = db.prepare("SELECT finished_at FROM source_syncs WHERE source='etsy' AND status='ok' AND shop_id=? ORDER BY id DESC LIMIT 1").get(shop.shop_id)
  const freshnessDays = synced ? (nowMs - Date.parse(synced.finished_at)) / 86400_000 : 99
  const results = []
  const ts = now()

  tx(db, () => {
    const keep = new Set()
    for (const l of listings) {
      const s = sales.get(l.listing_id)
      const a = auditListing(l, {
        sales: s,
        maxRevenue,
        hero: !!s && s.revenue_minor >= heroCut && s.revenue_minor > 0,
        research,
        taxonomy,
        freshnessDays,
      })
      results.push(a)
      for (const i of a.issues) {
        const id = fingerprint(l.listing_id, i)
        keep.add(id)
        const baseline = { units_12m: a.evidence.units_12m, revenue_12m_minor: a.evidence.revenue_12m_minor, favorites: l.num_favorers, views: l.views, at: ts }
        db.prepare(
          `INSERT INTO seo_recommendations (id, shop_id, listing_id, issue_type, field, current_value, proposed_value, reason, source, confidence, impact,
             severity, priority, automatable, hero, status, baseline_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'suggested', ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET current_value=excluded.current_value, reason=excluded.reason, priority=excluded.priority,
             confidence=excluded.confidence, hero=excluded.hero, updated_at=excluded.updated_at`,
        ).run(id, shop.shop_id, l.listing_id, i.issue_type, i.field, json(i.current), json(i.proposed), i.reason, i.source, i.confidence, i.impact, i.severity, i.priority, i.automatable ? 1 : 0, i.hero ? 1 : 0, json(baseline), ts, ts)
      }
    }
    // Suggestions that no longer apply are removed; staged/applied/dismissed history is kept.
    for (const r of db.prepare("SELECT id FROM seo_recommendations WHERE shop_id = ? AND status = 'suggested'").all(shop.shop_id)) {
      if (!keep.has(r.id)) db.prepare('DELETE FROM seo_recommendations WHERE id = ?').run(r.id)
    }
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('seo_audit', ?)").run(json({ at: ts, listings: listings.length }))
  })
  audit(db, 'seo.audit', { actor: 'system', shopId: shop.shop_id, detail: { listings: listings.length } })
  return results
}

export function recRow(r) {
  return { ...r, current_value: parse(r.current_value), proposed_value: parse(r.proposed_value), baseline: parse(r.baseline_json), automatable: !!r.automatable, hero: !!r.hero }
}
