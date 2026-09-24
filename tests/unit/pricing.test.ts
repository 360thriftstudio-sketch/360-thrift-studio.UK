import { describe, expect, it } from 'vitest'

import {
  basketTotal,
  defaultTiers,
  findTier,
  formatPence,
  priceAccess,
  priceLine,
  resolveTiers,
  sortTiers,
  tierSavingPercent,
  toPence,
  validateTiers,
  type PriceTier,
} from '@/lib/pricing'

const LADDER: PriceTier[] = [
  { minQty: 1, maxQty: 1, price: 200, unit: 'lot' },
  { minQty: 2, maxQty: 4, price: 190, unit: 'lot' },
  { minQty: 5, maxQty: 9, price: 180, unit: 'lot' },
  { minQty: 10, unit: 'lot', quoteOnly: true },
]

describe('money', () => {
  it('converts pounds to integer pence without float drift', () => {
    expect(toPence(0.1 + 0.2)).toBe(30)
    expect(toPence(19.99)).toBe(1999)
  })

  it('formats pence as GBP', () => {
    expect(formatPence(123456)).toBe('£1,234.56')
  })
})

describe('priceAccess', () => {
  const guest = { loggedIn: false, tradeApproved: false }
  const member = { loggedIn: true, tradeApproved: false }
  const trade = { loggedIn: true, tradeApproved: true }

  it('always hides on-request prices', () => {
    expect(priceAccess('on-request', trade)).toBe('on-request')
  })

  it('shows trade-only prices to approved trade accounts only', () => {
    expect(priceAccess('trade-only', member)).toBe('gated')
    expect(priceAccess('trade-only', trade)).toBe('visible')
  })

  it('shows public prices, unless the site requires login', () => {
    expect(priceAccess('public', guest)).toBe('visible')
    expect(priceAccess('public', guest, true)).toBe('gated')
    expect(priceAccess('public', member, true)).toBe('visible')
  })
})

describe('sortTiers', () => {
  it('orders by minQty without mutating the input', () => {
    const input = [LADDER[2], LADDER[0], LADDER[1]]
    expect(sortTiers(input).map((t) => t.minQty)).toEqual([1, 2, 5])
    expect(input[0].minQty).toBe(5)
  })
})

describe('validateTiers', () => {
  it('accepts the spec ladder and the default ladder', () => {
    expect(validateTiers(LADDER)).toEqual([])
    expect(validateTiers(defaultTiers(100))).toEqual([])
  })

  it('requires at least one band', () => {
    expect(validateTiers([])).toEqual(['Add at least one price band.'])
    expect(validateTiers(null)).toEqual(['Add at least one price band.'])
    expect(validateTiers(undefined)).toEqual(['Add at least one price band.'])
  })

  it('caps the number of bands at 4', () => {
    const five: PriceTier[] = [1, 2, 3, 4, 5].map((n) => ({
      minQty: n,
      maxQty: n === 5 ? null : n,
      price: 10,
      unit: 'lot',
    }))
    expect(validateTiers(five)).toContain('Use at most 4 price bands.')
  })

  it('requires the first band to start at 1', () => {
    expect(validateTiers([{ minQty: 2, price: 5, unit: 'lot' }])).toContain(
      'The first band must start at a quantity of 1.',
    )
  })

  it('rejects non-integer or zero minimums', () => {
    const errors = validateTiers([
      { minQty: 1, maxQty: 1, price: 5, unit: 'lot' },
      { minQty: 1.5, price: 5, unit: 'lot' },
    ])
    expect(errors).toContain('Band 2: minimum quantity must be a whole number of at least 1.')
  })

  it('rejects max below min', () => {
    expect(validateTiers([{ minQty: 1, maxQty: 0, price: 5, unit: 'lot' }])).toContain(
      'Band 1: maximum quantity is below the minimum.',
    )
  })

  it('rejects mixed units', () => {
    expect(
      validateTiers([
        { minQty: 1, maxQty: 1, price: 5, unit: 'lot' },
        { minQty: 2, price: 5, unit: 'kg' },
      ]),
    ).toContain('Band 2: all bands must use the same unit.')
  })

  it('requires a price unless quote only', () => {
    expect(validateTiers([{ minQty: 1, unit: 'lot' }])).toContain(
      'Band 1: enter a price, or mark the band as quote only.',
    )
    expect(validateTiers([{ minQty: 1, price: 0, unit: 'lot' }])).toHaveLength(1)
    expect(validateTiers([{ minQty: 1, unit: 'lot', quoteOnly: true }])).toEqual([])
  })

  it('only allows the last band to be open-ended', () => {
    expect(
      validateTiers([
        { minQty: 1, price: 5, unit: 'lot' },
        { minQty: 2, price: 4, unit: 'lot' },
      ]),
    ).toContain('Band 1: only the last band can be open-ended.')
  })

  it('rejects gaps and overlaps', () => {
    const gap = validateTiers([
      { minQty: 1, maxQty: 1, price: 5, unit: 'lot' },
      { minQty: 3, price: 4, unit: 'lot' },
    ])
    const overlap = validateTiers([
      { minQty: 1, maxQty: 3, price: 5, unit: 'lot' },
      { minQty: 2, price: 4, unit: 'lot' },
    ])
    expect(gap).toContain('Band 1: bands must follow on with no gaps or overlaps.')
    expect(overlap).toContain('Band 1: bands must follow on with no gaps or overlaps.')
  })
})

describe('findTier', () => {
  it.each([
    [1, 1],
    [2, 2],
    [4, 2],
    [5, 5],
    [9, 5],
    [10, 10],
    [250, 10],
  ])('qty %i uses the band starting at %i', (qty, min) => {
    expect(findTier(LADDER, qty)?.minQty).toBe(min)
  })

  it('returns undefined for qty below 1 or uncovered quantities', () => {
    expect(findTier(LADDER, 0)).toBeUndefined()
    expect(findTier([{ minQty: 1, maxQty: 3, price: 1, unit: 'lot' }], 4)).toBeUndefined()
  })
})

describe('resolveTiers', () => {
  it('returns a copy of the guide tiers when there is no price list', () => {
    const out = resolveTiers('lot-1', LADDER)
    expect(out).toEqual(LADDER)
    expect(out).not.toBe(LADDER)
    expect(resolveTiers('lot-1', LADDER, null)).toEqual(LADDER)
  })

  it('uses a per-lot override first', () => {
    const override: PriceTier[] = [{ minQty: 1, price: 150, unit: 'lot' }]
    const list = { discountPercent: 50, overrides: [{ lot: 'lot-1', tiers: override }] }
    expect(resolveTiers('lot-1', LADDER, list)).toEqual(override)
  })

  it('applies a percentage discount to priced bands only', () => {
    const out = resolveTiers('lot-2', LADDER, { discountPercent: 7.5 })
    expect(out.map((t) => t.price)).toEqual([185, 175.75, 166.5, undefined])
    expect(out[3].quoteOnly).toBe(true)
  })

  it('ignores zero, negative or missing discounts', () => {
    expect(resolveTiers('x', LADDER, { discountPercent: 0 })).toEqual(LADDER)
    expect(resolveTiers('x', LADDER, { discountPercent: -5 })).toEqual(LADDER)
    expect(resolveTiers('x', LADDER, { overrides: null })).toEqual(LADDER)
  })
})

describe('tierSavingPercent', () => {
  it('compares against the single-lot band', () => {
    expect(tierSavingPercent(LADDER, LADDER[0])).toBe(0)
    expect(tierSavingPercent(LADDER, LADDER[1])).toBe(5)
    expect(tierSavingPercent(LADDER, LADDER[2])).toBe(10)
  })

  it('is 0 for quote-only bands, missing prices, or price increases', () => {
    expect(tierSavingPercent(LADDER, LADDER[3])).toBe(0)
    expect(tierSavingPercent([], LADDER[1])).toBe(0)
    expect(tierSavingPercent(LADDER, { minQty: 2, price: 300, unit: 'lot' })).toBe(0)
  })
})

describe('priceLine', () => {
  it('prices per lot', () => {
    expect(priceLine({ tiers: LADDER, qty: 3 })).toEqual({
      tier: LADDER[1],
      perLotPence: 19000,
      subtotalPence: 57000,
      quoteOnly: false,
      savingPercent: 5,
    })
  })

  it('prices per kg using the bale weight', () => {
    const kg: PriceTier[] = [{ minQty: 1, price: 4.5, unit: 'kg' }]
    const line = priceLine({ tiers: kg, qty: 2, weightKg: 45 })
    expect(line.perLotPence).toBe(20250)
    expect(line.subtotalPence).toBe(40500)
  })

  it('prices per piece using the lot piece count', () => {
    const pc: PriceTier[] = [{ minQty: 1, price: 6.2, unit: 'piece' }]
    expect(priceLine({ tiers: pc, qty: 1, pieces: 50 }).subtotalPence).toBe(31000)
  })

  it('falls back to quote when weight or pieces are missing', () => {
    const kg: PriceTier[] = [{ minQty: 1, price: 4.5, unit: 'kg' }]
    const pc: PriceTier[] = [{ minQty: 1, price: 6, unit: 'piece' }]
    expect(priceLine({ tiers: kg, qty: 1 }).quoteOnly).toBe(true)
    expect(priceLine({ tiers: kg, qty: 1, weightKg: 0 }).quoteOnly).toBe(true)
    expect(priceLine({ tiers: pc, qty: 1, pieces: null }).quoteOnly).toBe(true)
  })

  it('returns quote-only for quote bands and uncovered quantities', () => {
    const tenPlus = priceLine({ tiers: LADDER, qty: 12 })
    expect(tenPlus).toEqual({
      tier: LADDER[3],
      perLotPence: null,
      subtotalPence: null,
      quoteOnly: true,
      savingPercent: 0,
    })
    expect(priceLine({ tiers: LADDER, qty: 0 }).tier).toBeUndefined()
  })
})

describe('basketTotal', () => {
  it('sums priced lines and flags quote-only lines', () => {
    const lines = [
      priceLine({ tiers: LADDER, qty: 1 }),
      priceLine({ tiers: LADDER, qty: 5 }),
      priceLine({ tiers: LADDER, qty: 20 }),
    ]
    expect(basketTotal(lines)).toEqual({ guideTotalPence: 20000 + 90000, hasQuoteOnlyLines: true })
  })

  it('is zero for an empty basket', () => {
    expect(basketTotal([])).toEqual({ guideTotalPence: 0, hasQuoteOnlyLines: false })
  })
})

describe('defaultTiers', () => {
  it('builds the 1 / 2–4 / 5–9 / 10+ ladder with 5% and 10% savings', () => {
    const tiers = defaultTiers(120, 'kg')
    expect(tiers.map((t) => [t.minQty, t.maxQty ?? null, t.price ?? null])).toEqual([
      [1, 1, 120],
      [2, 4, 114],
      [5, 9, 108],
      [10, null, null],
    ])
    expect(tiers.every((t) => t.unit === 'kg')).toBe(true)
  })

  it('defaults to per-lot pricing', () => {
    expect(defaultTiers(10)[0].unit).toBe('lot')
  })
})
