import { describe, expect, it } from 'vitest'

import {
  activeFilterLabels,
  computeFacets,
  filterLots,
  hasFilters,
  matchesQuery,
  parseListingParams,
  runListing,
  singleLotPence,
  sortLots,
  toQueryString,
  toggleFilter,
  type LotSummary,
} from '@/lib/facets'

const ref = (slug: string, name = slug) => ({ id: slug, slug, name })

function lot(p: Partial<LotSummary> & { id: string }): LotSummary {
  return {
    slug: p.id,
    sku: `SKU-${p.id}`,
    title: `Lot ${p.id}`,
    section: { ...ref('jackets', 'Jackets'), number: 12 },
    subcategories: [],
    brands: [],
    styles: [],
    collection: null,
    grade: 'a',
    lotType: 'single-brand',
    pieces: 30,
    weightKg: 20,
    era: null,
    division: ['mens'],
    descriptors: [],
    designGroups: [],
    bestFor: [],
    priceTiers: [{ minQty: 1, price: 100, unit: 'lot' }],
    priceVisibility: 'public',
    stock: { lotsAvailable: 3, status: 'in-stock' },
    badges: [],
    publishedAt: '2026-09-01T00:00:00Z',
    images: [],
    ...p,
  }
}

const LOTS: LotSummary[] = [
  lot({ id: '1', title: 'TNF Nuptse puffers', brands: [ref('the-north-face', 'The North Face')], grade: 'a', pieces: 25, descriptors: [{ ...ref('fill-power--700-fill', '700 Fill'), group: 'Fill power' }, { ...ref('hood--hooded', 'Hooded'), group: 'Hood' }], publishedAt: '2026-09-20T00:00:00Z', badges: ['best-seller'] }),
  lot({ id: '2', title: 'Carhartt Detroit', brands: [ref('carhartt', 'Carhartt')], grade: 'b', pieces: 60, weightKg: 55, priceTiers: [{ minQty: 1, price: 300, unit: 'lot' }], descriptors: [{ ...ref('hood--hooded', 'Hooded'), group: 'Hood' }], publishedAt: '2026-09-10T00:00:00Z' }),
  lot({ id: '3', title: 'Mixed windbreakers', brands: [ref('nike', 'Nike'), ref('adidas', 'Adidas')], lotType: 'mixed-brand', grade: 'a', pieces: 120, weightKg: 8, priceVisibility: 'trade-only', descriptors: [{ ...ref('fill-power--600-fill', '600 Fill'), group: 'Fill power' }], publishedAt: '2026-09-15T00:00:00Z' }),
  lot({ id: '4', title: 'Sold lot', brands: [ref('carhartt', 'Carhartt')], stock: { lotsAvailable: 0, status: 'sold' }, publishedAt: '2026-09-25T00:00:00Z' }),
]

describe('URL state', () => {
  it('parses comma lists, repeated params, sort, page and q', () => {
    const s = parseListingParams({ brand: 'nike,adidas', grade: ['a', 'b'], sort: 'price-asc', page: '3', q: '  nuptse ' })
    expect(s.filters).toEqual({ brand: ['nike', 'adidas'], grade: ['a', 'b'] })
    expect(s).toMatchObject({ sort: 'price-asc', page: 3, q: 'nuptse' })
  })

  it('falls back to safe defaults', () => {
    expect(parseListingParams({ sort: 'evil', page: '-2' })).toMatchObject({ sort: 'newest', page: 1, q: '' })
    expect(parseListingParams({ page: '9999' }).page).toBe(100)
    expect(parseListingParams({ brand: 'a,a,,b' }).filters.brand).toEqual(['a', 'b'])
  })

  it('round-trips to a query string without defaults', () => {
    expect(toQueryString({ filters: { grade: ['a'], brand: ['nike'] }, sort: 'newest', page: 1 })).toBe('?brand=nike&grade=a')
    expect(toQueryString({ filters: {}, sort: 'price-desc', page: 2, q: 'tnf' })).toBe('?q=tnf&sort=price-desc&page=2')
    expect(toQueryString({})).toBe('')
  })

  it('toggles values on and off', () => {
    const a = toggleFilter({}, 'grade', 'a')
    expect(a).toEqual({ grade: ['a'] })
    expect(toggleFilter(a, 'grade', 'a')).toEqual({})
    expect(hasFilters({ grade: [] })).toBe(false)
  })
})

describe('filtering', () => {
  it('ORs within a facet and ANDs across facets', () => {
    expect(filterLots(LOTS, { brand: ['carhartt', 'nike'] }).map((l) => l.id)).toEqual(['2', '3', '4'])
    expect(filterLots(LOTS, { brand: ['carhartt', 'nike'], grade: ['a'] }).map((l) => l.id)).toEqual(['3', '4'])
  })

  it('ANDs descriptor groups but ORs terms within a group', () => {
    expect(filterLots(LOTS, { desc: ['fill-power--700-fill', 'fill-power--600-fill'] }).map((l) => l.id)).toEqual(['1', '3'])
    expect(filterLots(LOTS, { desc: ['fill-power--700-fill', 'hood--hooded'] }).map((l) => l.id)).toEqual(['1'])
  })

  it('buckets pieces and weight', () => {
    expect(filterLots(LOTS, { size: ['100-plus'] }).map((l) => l.id)).toEqual(['3'])
    expect(filterLots(LOTS, { weight: ['under-10'] }).map((l) => l.id)).toEqual(['3'])
    expect(filterLots(LOTS, { weight: ['50-plus'] }).map((l) => l.id)).toEqual(['2'])
  })

  it('matches free-text across title, brand and SKU', () => {
    expect(matchesQuery(LOTS[0], 'north face')).toBe(true)
    expect(matchesQuery(LOTS[0], 'carhartt')).toBe(false)
    expect(matchesQuery(LOTS[1], 'sku-2')).toBe(true)
  })
})

describe('facets', () => {
  it('counts each facet ignoring its own selection (disjunctive)', () => {
    const facets = computeFacets(LOTS, { brand: ['carhartt'] })
    const brand = facets.find((f) => f.key === 'brand')!
    expect(brand.options.find((o) => o.value === 'nike')?.count).toBe(1)
    expect(brand.options.find((o) => o.value === 'carhartt')).toMatchObject({ count: 2, selected: true })
    const grade = facets.find((f) => f.key === 'grade')!
    expect(grade.options.map((o) => o.value)).toEqual(['a', 'b'])
  })

  it('hides facets implied by the page', () => {
    expect(computeFacets(LOTS, {}, ['brand']).some((f) => f.key === 'brand')).toBe(false)
  })

  it('labels active filters for pills', () => {
    const pills = activeFilterLabels(computeFacets(LOTS, { grade: ['b'] }))
    expect(pills).toEqual([{ key: 'grade', value: 'b', label: 'Grade: Grade B' }])
  })
})

describe('sorting & paging', () => {
  it('sorts newest first and always puts sold lots last', () => {
    expect(sortLots(LOTS, 'newest').map((l) => l.id)).toEqual(['1', '3', '2', '4'])
  })

  it('sorts by visible price, hiding gated prices at the end', () => {
    expect(sortLots(LOTS, 'price-asc').map((l) => l.id)).toEqual(['1', '2', '3', '4'])
    expect(sortLots(LOTS, 'price-desc').map((l) => l.id)).toEqual(['2', '1', '3', '4'])
    expect(singleLotPence(LOTS[2])).toBeNull()
  })

  it('sorts best sellers and pieces', () => {
    expect(sortLots(LOTS, 'best-sellers')[0].id).toBe('1')
    expect(sortLots(LOTS, 'pieces-desc').map((l) => l.id).slice(0, 2)).toEqual(['3', '2'])
  })

  it('runs the full pipeline', () => {
    const r = runListing(LOTS, { filters: { grade: ['a'] }, sort: 'newest', page: 1, q: '' })
    expect(r.total).toBe(3)
    expect(r.lots.map((l) => l.id)).toEqual(['1', '3', '4'])
    expect(r.shown).toBe(3)
  })
})
