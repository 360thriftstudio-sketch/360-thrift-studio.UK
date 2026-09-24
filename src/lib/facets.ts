/**
 * Listing engine: URL <-> filter state, filtering, disjunctive facet counts
 * and sorting. Pure functions over LotSummary so they are unit-tested and
 * shared by every listing (sections, subcategories, brands, styles, search).
 *
 * Within one facet values are OR'd; across facets they are AND'd. Each facet's
 * counts ignore its own selection, so buyers can widen a choice.
 */
import { priceLine, type PriceTier, type PriceVisibility } from './pricing'

export type Ref = { id: string; slug: string; name: string }

export type LotSummary = {
  id: string
  slug: string
  sku: string
  title: string
  section: Ref & { number: number }
  subcategories: (Ref & { group?: string | null })[]
  brands: (Ref & { count?: number | null })[]
  styles: Ref[]
  collection?: (Ref & { tier?: string | null }) | null
  grade: 'cream' | 'a' | 'b' | 'mixed'
  lotType: 'single-brand' | 'mixed-brand' | 'bale-kg' | 'shape-specific' | 'on-request'
  pieces?: number | null
  weightKg?: number | null
  era?: string | null
  division: string[]
  descriptors: (Ref & { group: string })[]
  designGroups: (Ref & { group: string })[]
  bestFor: Ref[]
  priceTiers: PriceTier[]
  priceVisibility: PriceVisibility
  stock: { lotsAvailable: number; status: 'in-stock' | 'low' | 'arriving' | 'reserved' | 'sold'; dispatch?: string | null; moq?: number | null }
  badges: ('new' | 'best-seller' | 'verified-era')[]
  publishedAt: string
  images: { url: string; alt: string }[]
}

/* ------------------------------------------------------------------ */
/* Facet definitions                                                   */
/* ------------------------------------------------------------------ */

export const FACET_KEYS = [
  'sub',
  'brand',
  'style',
  'collection',
  'grade',
  'lotType',
  'size',
  'weight',
  'era',
  'desc',
  'design',
  'bestFor',
  'division',
  'availability',
] as const
export type FacetKey = (typeof FACET_KEYS)[number]

export const FACET_LABELS: Record<FacetKey, string> = {
  sub: 'Subcategory',
  brand: 'Brand',
  style: 'Fashion category',
  collection: 'Brand collection / tier',
  grade: 'Grade',
  lotType: 'Lot type',
  size: 'Lot size (pieces)',
  weight: 'Weight (kg)',
  era: 'Era',
  desc: 'Details',
  design: 'Design group',
  bestFor: 'Best suited for',
  division: 'Gender / division',
  availability: 'Availability',
}

export const GRADE_LABELS: Record<LotSummary['grade'], string> = {
  cream: 'Cream',
  a: 'Grade A',
  b: 'Grade B',
  mixed: 'Mixed grades',
}

export const LOT_TYPE_LABELS: Record<LotSummary['lotType'], string> = {
  'single-brand': 'Single-brand lot',
  'mixed-brand': 'Mixed-brand lot',
  'bale-kg': 'Bale by kg',
  'shape-specific': 'Shape-specific',
  'on-request': 'On request',
}

export const ERA_LABELS: Record<string, string> = {
  'verified-vintage': 'Verified vintage',
  '1980s': '1980s',
  '1990s': '1990s',
  'verified-y2k': 'Verified Y2K',
  'y2k-style': 'Y2K style',
  modern: 'Modern',
}

export const DIVISION_LABELS: Record<string, string> = { womens: "Women's", mens: "Men's", unisex: 'Unisex' }

export const AVAILABILITY_LABELS: Record<string, string> = {
  'in-stock': 'In stock',
  low: 'Low stock',
  arriving: 'Arriving',
  reserved: 'Reserved',
  sold: 'Sold',
}

export const SIZE_BANDS = [
  { value: '10-25', label: '10–25 pieces', min: 0, max: 25 },
  { value: '26-50', label: '26–50 pieces', min: 26, max: 50 },
  { value: '51-100', label: '51–100 pieces', min: 51, max: 100 },
  { value: '100-plus', label: '100+ pieces', min: 101, max: Infinity },
] as const

export const WEIGHT_BANDS = [
  { value: 'under-10', label: 'Under 10 kg', min: 0, max: 9.999 },
  { value: '10-25', label: '10–25 kg', min: 10, max: 25 },
  { value: '25-50', label: '25–50 kg', min: 25.001, max: 50 },
  { value: '50-plus', label: '50 kg +', min: 50.001, max: Infinity },
] as const

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'best-sellers', label: 'Best sellers' },
  { value: 'price-asc', label: 'Price low–high' },
  { value: 'price-desc', label: 'Price high–low' },
  { value: 'pieces-desc', label: 'Pieces high–low' },
] as const
export type SortValue = (typeof SORT_OPTIONS)[number]['value']

export const PAGE_SIZE = 24

/* ------------------------------------------------------------------ */
/* URL state                                                           */
/* ------------------------------------------------------------------ */

export type Filters = Partial<Record<FacetKey, string[]>>
export type ListingState = { filters: Filters; sort: SortValue; page: number; q: string }

type SearchParams = Record<string, string | string[] | undefined>

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v)

export function parseListingParams(sp: SearchParams): ListingState {
  const filters: Filters = {}
  for (const key of FACET_KEYS) {
    const raw = sp[key]
    const values = (Array.isArray(raw) ? raw.join(',') : (raw ?? ''))
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
    if (values.length) filters[key] = [...new Set(values)]
  }
  const sortRaw = first(sp.sort)
  const sort = (SORT_OPTIONS.some((o) => o.value === sortRaw) ? sortRaw : 'newest') as SortValue
  const pageNum = Number.parseInt(first(sp.page) ?? '1', 10)
  const page = Number.isFinite(pageNum) && pageNum > 0 ? Math.min(pageNum, 100) : 1
  const q = (first(sp.q) ?? '').trim().slice(0, 100)
  return { filters, sort, page, q }
}

/** Serialise state back to a query string (stable key order, no defaults). */
export function toQueryString(state: Partial<ListingState>): string {
  const params = new URLSearchParams()
  if (state.q) params.set('q', state.q)
  for (const key of FACET_KEYS) {
    const values = state.filters?.[key]
    if (values?.length) params.set(key, values.join(','))
  }
  if (state.sort && state.sort !== 'newest') params.set('sort', state.sort)
  if (state.page && state.page > 1) params.set('page', String(state.page))
  const s = params.toString()
  return s ? `?${s}` : ''
}

export function toggleFilter(filters: Filters, key: FacetKey, value: string): Filters {
  const current = filters[key] ?? []
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
  const out: Filters = { ...filters }
  if (next.length) out[key] = next
  else delete out[key]
  return out
}

export const hasFilters = (f: Filters): boolean => Object.values(f).some((v) => v && v.length > 0)

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

function valuesFor(lot: LotSummary, key: FacetKey): string[] {
  switch (key) {
    case 'sub':
      return lot.subcategories.map((s) => s.slug)
    case 'brand':
      return lot.brands.map((b) => b.slug)
    case 'style':
      return lot.styles.map((s) => s.slug)
    case 'collection':
      return lot.collection ? [lot.collection.slug] : []
    case 'grade':
      return [lot.grade]
    case 'lotType':
      return [lot.lotType]
    case 'size':
      return lot.pieces == null
        ? []
        : SIZE_BANDS.filter((b) => lot.pieces! >= b.min && lot.pieces! <= b.max).map((b) => b.value)
    case 'weight':
      return lot.weightKg == null
        ? []
        : WEIGHT_BANDS.filter((b) => lot.weightKg! >= b.min && lot.weightKg! <= b.max).map((b) => b.value)
    case 'era':
      return lot.era ? [lot.era] : []
    case 'desc':
      return lot.descriptors.map((d) => d.slug)
    case 'design':
      return lot.designGroups.map((d) => d.slug)
    case 'bestFor':
      return lot.bestFor.map((b) => b.slug)
    case 'division':
      return lot.division
    case 'availability':
      return [lot.stock.status]
  }
}

function matchesFacet(lot: LotSummary, key: FacetKey, selected: string[] | undefined): boolean {
  if (!selected || selected.length === 0) return true
  const vals = valuesFor(lot, key)
  // Descriptors are AND across different descriptor groups, OR within a group.
  if (key === 'desc') {
    const byGroup = new Map<string, string[]>()
    for (const slug of selected) {
      const group = slug.split('--')[0]
      byGroup.set(group, [...(byGroup.get(group) ?? []), slug])
    }
    return [...byGroup.values()].every((slugs) => slugs.some((s) => vals.includes(s)))
  }
  return selected.some((s) => vals.includes(s))
}

export function matchesQuery(lot: LotSummary, q: string): boolean {
  if (!q) return true
  const hay = [
    lot.title,
    lot.sku,
    lot.section.name,
    ...lot.brands.map((b) => b.name),
    ...lot.subcategories.map((s) => s.name),
    ...lot.styles.map((s) => s.name),
    lot.collection?.name ?? '',
    ...lot.descriptors.map((d) => d.name),
  ]
    .join(' ')
    .toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word))
}

export function filterLots(lots: readonly LotSummary[], filters: Filters, except?: FacetKey): LotSummary[] {
  return lots.filter((lot) =>
    FACET_KEYS.every((key) => key === except || matchesFacet(lot, key, filters[key])),
  )
}

/* ------------------------------------------------------------------ */
/* Facet counts                                                        */
/* ------------------------------------------------------------------ */

export type FacetOption = { value: string; label: string; count: number; selected: boolean; group?: string }
export type Facet = { key: FacetKey; label: string; options: FacetOption[]; groupLabel?: string }

function labelFor(lot: LotSummary, key: FacetKey, value: string): { label: string; group?: string } {
  switch (key) {
    case 'sub': {
      const s = lot.subcategories.find((x) => x.slug === value)
      return { label: s?.name ?? value, group: s?.group ?? undefined }
    }
    case 'brand':
      return { label: lot.brands.find((x) => x.slug === value)?.name ?? value }
    case 'style':
      return { label: lot.styles.find((x) => x.slug === value)?.name ?? value }
    case 'collection':
      return { label: lot.collection?.name ?? value }
    case 'grade':
      return { label: GRADE_LABELS[value as LotSummary['grade']] ?? value }
    case 'lotType':
      return { label: LOT_TYPE_LABELS[value as LotSummary['lotType']] ?? value }
    case 'size':
      return { label: SIZE_BANDS.find((b) => b.value === value)?.label ?? value }
    case 'weight':
      return { label: WEIGHT_BANDS.find((b) => b.value === value)?.label ?? value }
    case 'era':
      return { label: ERA_LABELS[value] ?? value }
    case 'desc': {
      const d = lot.descriptors.find((x) => x.slug === value)
      return { label: d?.name ?? value, group: d?.group }
    }
    case 'design': {
      const d = lot.designGroups.find((x) => x.slug === value)
      return { label: d?.name ?? value, group: d?.group }
    }
    case 'bestFor':
      return { label: lot.bestFor.find((x) => x.slug === value)?.name ?? value }
    case 'division':
      return { label: DIVISION_LABELS[value] ?? value }
    case 'availability':
      return { label: AVAILABILITY_LABELS[value] ?? value }
  }
}

const FIXED_ORDER: Partial<Record<FacetKey, readonly string[]>> = {
  grade: ['cream', 'a', 'b', 'mixed'],
  lotType: Object.keys(LOT_TYPE_LABELS),
  size: SIZE_BANDS.map((b) => b.value),
  weight: WEIGHT_BANDS.map((b) => b.value),
  era: Object.keys(ERA_LABELS),
  division: Object.keys(DIVISION_LABELS),
  availability: Object.keys(AVAILABILITY_LABELS),
}

/**
 * Disjunctive facet counts. Options with zero results are kept (disabled in the
 * UI) only when selected, so the current selection can always be removed.
 * `hide` removes facets implied by the page (e.g. Brand on a brand page).
 */
export function computeFacets(
  lots: readonly LotSummary[],
  filters: Filters,
  hide: readonly FacetKey[] = [],
): Facet[] {
  const facets: Facet[] = []
  for (const key of FACET_KEYS) {
    if (hide.includes(key)) continue
    const pool = filterLots(lots, filters, key)
    const counts = new Map<string, { count: number; label: string; group?: string }>()
    // Labels come from the whole scope so zero-count selected values still have names.
    for (const lot of lots) {
      for (const v of new Set(valuesFor(lot, key))) {
        if (!counts.has(v)) counts.set(v, { count: 0, ...labelFor(lot, key, v) })
      }
    }
    for (const lot of pool) {
      for (const v of new Set(valuesFor(lot, key))) counts.get(v)!.count++
    }
    const selected = filters[key] ?? []
    let options: FacetOption[] = [...counts.entries()]
      .filter(([v, c]) => c.count > 0 || selected.includes(v))
      .map(([value, c]) => ({ value, label: c.label, count: c.count, selected: selected.includes(value), group: c.group }))

    const order = FIXED_ORDER[key]
    if (order) {
      options.sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value))
    } else if (key === 'sub') {
      // keep catalogue order (A/B/C groups) — lots list subcategories in order already
      options.sort((a, b) => (a.group ?? '').localeCompare(b.group ?? '') || a.label.localeCompare(b.label))
    } else if (key === 'desc' || key === 'design') {
      options.sort((a, b) => (a.group ?? '').localeCompare(b.group ?? '') || a.label.localeCompare(b.label))
    } else if (key === 'brand') {
      options.sort((a, b) => a.label.localeCompare(b.label))
    } else {
      options.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    }
    options = options.filter((o, i, arr) => arr.findIndex((x) => x.value === o.value) === i)
    if (options.length === 0) continue
    // A facet with a single option that every result shares adds nothing.
    if (options.length === 1 && !options[0].selected && options[0].count === pool.length && key !== 'availability') continue
    facets.push({ key, label: FACET_LABELS[key], options })
  }
  return facets
}

/* ------------------------------------------------------------------ */
/* Sorting & paging                                                    */
/* ------------------------------------------------------------------ */

/** Guide price of one lot in pence, or null when quote-only / hidden. */
export function singleLotPence(lot: LotSummary): number | null {
  if (lot.priceVisibility !== 'public') return null
  return priceLine({ tiers: lot.priceTiers, qty: 1, weightKg: lot.weightKg, pieces: lot.pieces }).perLotPence
}

const time = (l: LotSummary) => new Date(l.publishedAt).getTime() || 0

export function sortLots(lots: readonly LotSummary[], sort: SortValue): LotSummary[] {
  const out = [...lots]
  const soldLast = (a: LotSummary, b: LotSummary) =>
    Number(a.stock.status === 'sold') - Number(b.stock.status === 'sold')
  const byPrice = (dir: 1 | -1) => (a: LotSummary, b: LotSummary) => {
    const pa = singleLotPence(a)
    const pb = singleLotPence(b)
    if (pa == null && pb == null) return 0
    if (pa == null) return 1
    if (pb == null) return -1
    return (pa - pb) * dir
  }
  const cmp: Record<SortValue, (a: LotSummary, b: LotSummary) => number> = {
    newest: (a, b) => time(b) - time(a),
    'best-sellers': (a, b) =>
      Number(b.badges.includes('best-seller')) - Number(a.badges.includes('best-seller')) || time(b) - time(a),
    'price-asc': byPrice(1),
    'price-desc': byPrice(-1),
    'pieces-desc': (a, b) => (b.pieces ?? 0) - (a.pieces ?? 0),
  }
  return out.sort((a, b) => soldLast(a, b) || cmp[sort](a, b) || a.title.localeCompare(b.title))
}

export type ListingResult = {
  lots: LotSummary[]
  total: number
  shown: number
  facets: Facet[]
  state: ListingState
}

/** Full pipeline for a listing page. Shows pages 1..page ("Load more"). */
export function runListing(
  scope: readonly LotSummary[],
  state: ListingState,
  hide: readonly FacetKey[] = [],
): ListingResult {
  const inQuery = scope.filter((l) => matchesQuery(l, state.q))
  const filtered = sortLots(filterLots(inQuery, state.filters), state.sort)
  const shown = Math.min(filtered.length, state.page * PAGE_SIZE)
  return {
    lots: filtered.slice(0, shown),
    total: filtered.length,
    shown,
    facets: computeFacets(inQuery, state.filters, hide),
    state,
  }
}

/** Human label for an active filter pill. */
export function activeFilterLabels(facets: readonly Facet[]): { key: FacetKey; value: string; label: string }[] {
  return facets.flatMap((f) =>
    f.options.filter((o) => o.selected).map((o) => ({ key: f.key, value: o.value, label: `${f.label}: ${o.label}` })),
  )
}

