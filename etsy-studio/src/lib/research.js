// Research sync, Marketplace Insights import and the opportunity / keyword-gap model.
import fs from 'node:fs'
import path from 'node:path'
import { getConfig } from './config.js'
import { audit, json, now, parse, tx } from './db.js'
import { activeListings, listingSales } from './analytics.js'
import { phraseMatcher, tokens, clamp } from './text.js'
import { titleSegments } from './seo.js'
import { withLock } from './jobs.js'

const DAY = 86400_000

/** Seeds: configured ones, else the lead phrase of the shop's best sellers. */
export function researchSeeds(db, shop, configured = getConfig().krafie.seeds) {
  if (configured.length) return configured
  const sales = listingSales(db, shop.shop_id, Date.now() - 365 * DAY)
  const listings = activeListings(db, shop.shop_id)
  const ranked = listings.sort((a, b) => (sales.get(b.listing_id)?.revenue_minor ?? 0) - (sales.get(a.listing_id)?.revenue_minor ?? 0))
  const seeds = []
  for (const l of ranked) {
    const s = (titleSegments(l.title)[0] ?? '').split(/\s+/).slice(0, 3).join(' ').toLowerCase()
    if (s && !seeds.includes(s)) seeds.push(s)
    if (seeds.length >= 6) break
  }
  return seeds
}

export async function syncResearch(db, shop, provider, { seeds } = {}) {
  return withLock(db, 'research-sync', async () => {
    const started = now()
    const id = db.prepare("INSERT INTO source_syncs (source, shop_id, started_at, status) VALUES (?, ?, ?, 'running')").run(provider.name, shop.shop_id, started).lastInsertRowid
    const list = seeds ?? researchSeeds(db, shop)
    const errors = []
    const keywords = []
    const listings = []
    try {
      await provider.connect()
      for (const seed of list) {
        try {
          keywords.push(...(await provider.keywordOpportunities(seed)))
        } catch (e) {
          errors.push(`${seed}: ${e.message}`)
        }
        try {
          listings.push(...(await provider.viralListings(seed)))
        } catch (e) {
          if (e.code !== 'UNSUPPORTED') errors.push(`${seed} (listings): ${e.message}`)
        }
      }
      if (!keywords.length && errors.length) throw new Error(errors[0])
      // Several seeds often return the same keyword; keep the first occurrence.
      const uniq = new Map()
      for (const k of keywords) if (!uniq.has(k.keyword)) uniq.set(k.keyword, k)
      keywords.length = 0
      keywords.push(...uniq.values())
      const capturedDay = started.slice(0, 10)
      tx(db, () => {
        const insK = db.prepare(
          `INSERT OR REPLACE INTO research_keywords (shop_id, provider, keyword, theme, opportunity, demand, trend, competition, est_sales, captured_at, metrics_json, samples_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        const seen = new Set()
        for (const k of keywords) {
          if (seen.has(k.keyword)) continue
          seen.add(k.keyword)
          insK.run(shop.shop_id, provider.name, k.keyword, k.theme, k.opportunity, k.demand, k.trend, k.competition, k.est_sales, capturedDay, json({ confidence: k.confidence }), json(k.samples))
        }
        const insL = db.prepare(
          `INSERT OR REPLACE INTO research_listings (shop_id, provider, url, title, price, currency, est_sales, trend, category, captured_at, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        for (const l of listings) if (l.url || l.title) insL.run(shop.shop_id, provider.name, l.url ?? l.title, l.title, l.price, l.currency, l.est_sales, l.trend, l.category, capturedDay, json(l))
      })
      const dir = getConfig().paths.research
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(
        path.join(dir, `${provider.name}-${capturedDay}.json`),
        JSON.stringify({ meta: { provider: provider.name, label: 'Third-party estimates — not official Etsy data', captured_at: started, seeds: list, errors }, keywords, listings }),
      )
      const counts = { keywords: keywords.length, listings: listings.length, seeds: list.length, warnings: errors }
      db.prepare("UPDATE source_syncs SET finished_at=?, status='ok', counts_json=? WHERE id=?").run(now(), json(counts), id)
      audit(db, 'research.sync', { actor: 'sync', shopId: shop.shop_id, detail: counts })
      return counts
    } catch (err) {
      db.prepare("UPDATE source_syncs SET finished_at=?, status='failed', error=? WHERE id=?").run(now(), err.message.slice(0, 500), id)
      throw err
    } finally {
      provider.close()
    }
  })
}

// ---------- Marketplace Insights import (official Etsy, manual/CSV) ----------

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') q = false
      else field += c
    } else if (c === '"') q = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      if (row.some((x) => x.trim() !== '')) rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  row.push(field)
  if (row.some((x) => x.trim() !== '')) rows.push(row)
  return rows
}

const HEADER_MAP = {
  keyword: /^(keyword|search term|search query|query|term)$/i,
  searches: /^(searches|searches_30d|monthly searches|search volume|searches \(30 days\))$/i,
  listing_count: /^(listings|listing count|listings_30d|competing listings|results)$/i,
  trend: /^(trend|change)$/i,
  conversion: /^(conversion|conversion rate)$/i,
  price_low: /^(price low|min price|price_low)$/i,
  price_high: /^(price high|max price|price_high)$/i,
  captured_at: /^(captured_at|captured|date)$/i,
}

export const INSIGHTS_TEMPLATE = 'keyword,searches_30d,listings_30d,trend,captured_at\nexample keyword,1200,3400,rising,2026-10-01\n'

export function importInsights(db, shop, csvText, { filename = 'manual.csv', capturedAt } = {}) {
  const rows = parseCsv(csvText)
  if (rows.length < 2) throw new Error('No data rows found. Use the template header: ' + INSIGHTS_TEMPLATE.split('\n')[0])
  const header = rows[0].map((h) => h.trim())
  const idx = {}
  for (const [k, re] of Object.entries(HEADER_MAP)) idx[k] = header.findIndex((h) => re.test(h))
  if (idx.keyword < 0) throw new Error('A "keyword" column is required.')
  const intOrNull = (v) => {
    const n = Number(String(v ?? '').replace(/[^\d.]/g, ''))
    return String(v ?? '').trim() === '' || !Number.isFinite(n) ? null : Math.round(n)
  }
  const fallbackDate = capturedAt ?? now().slice(0, 10)
  const out = []
  const errors = []
  rows.slice(1).forEach((r, i) => {
    const keyword = String(r[idx.keyword] ?? '').trim().toLowerCase()
    if (!keyword || keyword.length > 120) return errors.push(`row ${i + 2}: missing or too-long keyword`)
    const cap = idx.captured_at >= 0 && /^\d{4}-\d{2}-\d{2}/.test(r[idx.captured_at] ?? '') ? r[idx.captured_at].slice(0, 10) : fallbackDate
    out.push({
      keyword,
      searches: idx.searches >= 0 ? intOrNull(r[idx.searches]) : null,
      listing_count: idx.listing_count >= 0 ? intOrNull(r[idx.listing_count]) : null,
      trend: idx.trend >= 0 ? String(r[idx.trend] ?? '').slice(0, 30) || null : null,
      conversion: idx.conversion >= 0 ? Number(String(r[idx.conversion]).replace('%', '')) || null : null,
      price_low: idx.price_low >= 0 ? Number(r[idx.price_low]) || null : null,
      price_high: idx.price_high >= 0 ? Number(r[idx.price_high]) || null : null,
      captured_at: cap,
    })
  })
  tx(db, () => {
    const ins = db.prepare(
      `INSERT OR REPLACE INTO marketplace_insights_imports (shop_id, keyword, searches, listing_count, trend, conversion, price_low, price_high, range_start, range_end, captured_at, import_file)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    for (const o of out) {
      const start = new Date(Date.parse(o.captured_at) - 30 * DAY).toISOString().slice(0, 10)
      ins.run(shop.shop_id, o.keyword, o.searches, o.listing_count, o.trend, o.conversion, o.price_low, o.price_high, start, o.captured_at, o.captured_at, path.basename(filename))
    }
  })
  audit(db, 'insights.import', { shopId: shop.shop_id, detail: { rows: out.length, errors: errors.length, file: path.basename(filename) } })
  return { imported: out.length, errors }
}

/** Import any CSV files dropped in data/imports/marketplace-insights/ that haven't been imported yet. */
export function importWatchedFolder(db, shop) {
  const dir = getConfig().paths.imports
  if (!fs.existsSync(dir)) return []
  const done = new Set(db.prepare('SELECT DISTINCT import_file FROM marketplace_insights_imports WHERE shop_id = ?').all(shop.shop_id).map((r) => r.import_file))
  const results = []
  for (const f of fs.readdirSync(dir)) {
    if (!/\.csv$/i.test(f) || done.has(f)) continue
    try {
      results.push({ file: f, ...importInsights(db, shop, fs.readFileSync(path.join(dir, f), 'utf8'), { filename: f }) })
    } catch (e) {
      results.push({ file: f, error: e.message })
    }
  }
  return results
}

// ---------- Opportunity model ----------

export const WEIGHTS = {
  without: { internal: 0.55, scarcity: 0.25, krafie: 0.2, official: 0 },
  with: { internal: 0.4, scarcity: 0.2, krafie: 0.15, official: 0.25 },
}

export function latestKeywords(db, shopId) {
  // newest capture per keyword+provider
  return db
    .prepare(
      `SELECT k.* FROM research_keywords k JOIN (SELECT keyword, provider, MAX(captured_at) c FROM research_keywords WHERE shop_id = ? GROUP BY keyword, provider) m
       ON m.keyword = k.keyword AND m.provider = k.provider AND m.c = k.captured_at WHERE k.shop_id = ?`,
    )
    .all(shopId, shopId)
}

export function latestInsights(db, shopId) {
  return new Map(
    db
      .prepare(
        `SELECT i.* FROM marketplace_insights_imports i JOIN (SELECT keyword, MAX(captured_at) c FROM marketplace_insights_imports WHERE shop_id=? GROUP BY keyword) m
         ON m.keyword = i.keyword AND m.c = i.captured_at WHERE i.shop_id = ?`,
      )
      .all(shopId, shopId)
      .map((r) => [r.keyword, r]),
  )
}

/**
 * Score every keyword. Returns rows with components (each 0-100), formula text and exact evidence.
 * opts.synonyms / opts.exclusions refine matching.
 */
export function keywordGaps(db, shop, { nowMs = Date.now(), synonyms = {}, exclusions = [] } = {}) {
  const id = shop.shop_id
  const kws = latestKeywords(db, id)
  const insights = latestInsights(db, id)
  const keywordSet = new Map()
  for (const k of kws) keywordSet.set(k.keyword, { ...k, samples: parse(k.samples_json, []) })
  for (const [kw, ins] of insights) if (!keywordSet.has(kw)) keywordSet.set(kw, { keyword: kw, provider: null, theme: null, captured_at: ins.captured_at, samples: [] })

  const listings = activeListings(db, id).map((l) => ({ ...l, _tok: new Set(tokens(`${l.title} ${(l.tags ?? []).join(' ')}`)) }))
  const tx12 = db
    .prepare(
      `SELECT t.transaction_id, t.listing_id, t.title, t.quantity, t.price_minor, r.created_at FROM receipt_transactions t
       JOIN receipts_sanitized r ON r.receipt_id = t.receipt_id WHERE r.shop_id = ? AND r.created_at >= ? AND r.is_paid = 1
       AND COALESCE(r.status,'') NOT IN ('canceled','cancelled','fully refunded')`,
    )
    .all(id, new Date(nowMs - 365 * DAY).toISOString())
  const listingTok = new Map(listings.map((l) => [l.listing_id, l._tok]))
  const txTok = tx12.map((t) => listingTok.get(t.listing_id) ?? new Set(tokens(t.title)))

  const rows = []
  for (const k of keywordSet.values()) {
    const match = phraseMatcher(k.keyword, { synonyms, exclusions })
    const matchedListings = listings.filter((l) => match(l._tok))
    const matchedTx = tx12.filter((_, i) => match(txTok[i]))
    const units = matchedTx.reduce((s, t) => s + t.quantity, 0)
    const revenue = matchedTx.reduce((s, t) => s + t.quantity * t.price_minor, 0)
    const ins = insights.get(k.keyword) ?? null
    rows.push({
      keyword: k.keyword,
      theme: k.theme,
      provider: k.provider,
      captured_at: k.captured_at,
      krafie: k.provider ? { opportunity: k.opportunity, demand: k.demand, trend: k.trend, competition: k.competition, est_sales: k.est_sales } : null,
      official: ins ? { searches: ins.searches, listing_count: ins.listing_count, trend: ins.trend, captured_at: ins.captured_at, ratio: ins.searches && ins.listing_count ? Math.round((ins.searches / ins.listing_count) * 100) / 100 : null } : null,
      units_12m: units,
      revenue_12m_minor: revenue,
      catalog_matches: matchedListings.length,
      evidence: {
        listings: matchedListings.slice(0, 12).map((l) => ({ listing_id: l.listing_id, title: l.title })),
        transactions: matchedTx.length,
        sample_transactions: matchedTx.slice(0, 8).map((t) => ({ listing_id: t.listing_id, title: t.title, quantity: t.quantity, created_at: t.created_at.slice(0, 10) })),
        samples: k.samples ?? [],
      },
    })
  }

  // Normalise internal demand across keywords: half units, half revenue, square-root damped.
  const maxU = Math.max(1, ...rows.map((r) => r.units_12m))
  const maxR = Math.max(1, ...rows.map((r) => r.revenue_12m_minor))
  const ratios = rows.map((r) => r.official?.ratio).filter((x) => x !== null && x !== undefined)
  const maxRatio = Math.max(0, ...ratios)
  for (const r of rows) {
    const internal = clamp(50 * Math.sqrt(r.units_12m / maxU) + 50 * Math.sqrt(r.revenue_12m_minor / maxR))
    const scarcity = clamp(100 - r.catalog_matches * 20)
    const kr = r.krafie
    const krafie = kr ? clamp(kr.opportunity ?? avgDefined([kr.demand, kr.trend, kr.competition === null ? null : 100 - kr.competition]) ?? 0) : null
    const official = r.official?.ratio !== null && r.official?.ratio !== undefined && maxRatio ? clamp((r.official.ratio / maxRatio) * 100) : null
    const w = official !== null ? WEIGHTS.with : WEIGHTS.without
    // Missing Krafie signal: its weight is redistributed rather than treated as zero.
    const parts = [
      ['internal', internal, w.internal],
      ['scarcity', scarcity, w.scarcity],
      ['krafie', krafie, w.krafie],
      ['official', official, w.official],
    ].filter(([, v, wt]) => v !== null && wt > 0)
    const wsum = parts.reduce((s, [, , wt]) => s + wt, 0)
    const score = Math.round(parts.reduce((s, [, v, wt]) => s + v * wt, 0) / wsum)
    r.components = { internal: Math.round(internal), scarcity, krafie: krafie === null ? null : Math.round(krafie), official: official === null ? null : Math.round(official) }
    r.weights = Object.fromEntries(parts.map(([k, , wt]) => [k, Math.round((wt / wsum) * 100) / 100]))
    r.score = score
    r.formula = parts.map(([k, v, wt]) => `${Math.round((wt / wsum) * 100)}% × ${k} ${Math.round(v)}`).join(' + ') + ` = ${score}`
    r.confidence = official !== null && r.units_12m > 0 ? 'high' : r.units_12m > 0 && krafie !== null && krafie >= 50 ? 'medium' : 'exploratory'
    r.mode = r.catalog_matches === 0 ? 'new' : r.units_12m > 0 && r.catalog_matches <= 2 ? 'expand' : 'optimize'
    r.angle = productAngle(r)
    r.freshness = staleness(r.captured_at, nowMs)
  }
  return rows.sort((a, b) => b.score - a.score)
}

function avgDefined(xs) {
  const v = xs.filter((x) => x !== null && x !== undefined)
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null
}

function staleness(capturedAt, nowMs) {
  if (!capturedAt) return { days: null, warning: 'No capture date' }
  const days = Math.floor((nowMs - Date.parse(capturedAt)) / DAY)
  return { days, warning: days > 30 ? `Research is ${days} days old — refresh before acting.` : null }
}

function productAngle(r) {
  if (r.catalog_matches === 0 && r.units_12m === 0) return `New product: test a listing built around “${r.keyword}”.`
  if (r.catalog_matches === 0) return `Your sales already touch “${r.keyword}” but no active listing targets it — add a dedicated product.`
  if (r.units_12m > 0 && r.catalog_matches <= 2) return `Proven demand with only ${r.catalog_matches} listing(s) — add a variant, bundle or new style.`
  return `Covered by ${r.catalog_matches} listings — optimise titles/tags of the best one rather than adding more.`
}

export function storeOpportunities(db, shop, rows) {
  const ts = now()
  tx(db, () => {
    db.prepare('DELETE FROM product_opportunities WHERE shop_id = ?').run(shop.shop_id)
    const ins = db.prepare('INSERT INTO product_opportunities (shop_id, keyword, score, confidence, components_json, computed_at) VALUES (?, ?, ?, ?, ?, ?)')
    for (const r of rows) ins.run(shop.shop_id, r.keyword, r.score, r.confidence, json({ components: r.components, weights: r.weights }), ts)
  })
}
