/**
 * Pricing — the ONLY place guide-price maths lives.
 * Shared by the quote basket, the lot page PriceTierTable and the quote PDF.
 *
 * Conventions
 * - `qty` is always a number of lots (or bales). Never kilos or pieces.
 * - Tier `price` is in pounds (GBP) as entered in the CMS; all arithmetic is
 *   done in integer pence to avoid floating-point drift.
 * - Prices are guide prices, excl. VAT & shipping. The final price is on the quote.
 */

export type PriceUnit = 'lot' | 'kg' | 'piece'

export type PriceTier = {
  minQty: number
  maxQty?: number | null
  /** GBP per unit. Omitted when the band is quote-only. */
  price?: number | null
  unit: PriceUnit
  quoteOnly?: boolean | null
}

export type PriceVisibility = 'public' | 'trade-only' | 'on-request'

export type PriceList = {
  /** Percentage off every guide price, e.g. 7.5 for Tier A trade customers. */
  discountPercent?: number | null
  /** Per-lot tier overrides, keyed by lot id. Take priority over discountPercent. */
  overrides?: { lot: string; tiers: PriceTier[] }[] | null
}

export type Viewer = {
  loggedIn: boolean
  /** Customer passed the trade account check. */
  tradeApproved: boolean
}

export type PriceAccess = 'visible' | 'gated' | 'on-request'

export const MAX_TIERS = 4

export const PRICE_LABEL = 'Guide price · excl. VAT & shipping'
export const PRICE_FOOTNOTE = 'Guide price, excl. VAT & shipping; final price on your quote'

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

export const toPence = (pounds: number): number => Math.round(pounds * 100)

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })

export const formatPence = (pence: number): string => gbp.format(pence / 100)

/* ------------------------------------------------------------------ */
/* Visibility                                                          */
/* ------------------------------------------------------------------ */

/**
 * Whether a viewer may see a lot's guide prices.
 * `requireLoginForPrices` is the site-wide switch in CMS Settings.
 */
export function priceAccess(
  visibility: PriceVisibility,
  viewer: Viewer,
  requireLoginForPrices = false,
): PriceAccess {
  if (visibility === 'on-request') return 'on-request'
  if (visibility === 'trade-only') return viewer.tradeApproved ? 'visible' : 'gated'
  if (requireLoginForPrices && !viewer.loggedIn) return 'gated'
  return 'visible'
}

/* ------------------------------------------------------------------ */
/* Tiers                                                               */
/* ------------------------------------------------------------------ */

export function sortTiers(tiers: readonly PriceTier[]): PriceTier[] {
  return [...tiers].sort((a, b) => a.minQty - b.minQty)
}

/** Validation used by the Lot collection and CSV import. Empty array = valid. */
export function validateTiers(tiers: readonly PriceTier[] | null | undefined): string[] {
  const errors: string[] = []
  if (!tiers || tiers.length === 0) return ['Add at least one price band.']
  if (tiers.length > MAX_TIERS) errors.push(`Use at most ${MAX_TIERS} price bands.`)

  const sorted = sortTiers(tiers)
  const unit = sorted[0].unit
  if (sorted[0].minQty !== 1) errors.push('The first band must start at a quantity of 1.')

  sorted.forEach((tier, i) => {
    const label = `Band ${i + 1}`
    if (!Number.isInteger(tier.minQty) || tier.minQty < 1) {
      errors.push(`${label}: minimum quantity must be a whole number of at least 1.`)
    }
    if (tier.maxQty != null && tier.maxQty < tier.minQty) {
      errors.push(`${label}: maximum quantity is below the minimum.`)
    }
    if (tier.unit !== unit) errors.push(`${label}: all bands must use the same unit.`)
    if (!tier.quoteOnly && (tier.price == null || tier.price <= 0)) {
      errors.push(`${label}: enter a price, or mark the band as quote only.`)
    }
    const next = sorted[i + 1]
    if (next) {
      if (tier.maxQty == null) {
        errors.push(`${label}: only the last band can be open-ended.`)
      } else if (next.minQty !== tier.maxQty + 1) {
        errors.push(`${label}: bands must follow on with no gaps or overlaps.`)
      }
    }
  })

  return errors
}

/** The band that applies to a quantity, or undefined if none covers it. */
export function findTier(tiers: readonly PriceTier[], qty: number): PriceTier | undefined {
  if (qty < 1) return undefined
  return sortTiers(tiers).find(
    (t) => qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty),
  )
}

/** Apply an account-level price list. Overrides win over percentage discounts. */
export function resolveTiers(
  lotId: string,
  tiers: readonly PriceTier[],
  priceList?: PriceList | null,
): PriceTier[] {
  if (!priceList) return [...tiers]
  const override = priceList.overrides?.find((o) => o.lot === lotId)
  if (override) return [...override.tiers]
  const pct = priceList.discountPercent ?? 0
  if (pct <= 0) return [...tiers]
  return tiers.map((t) =>
    t.price == null ? { ...t } : { ...t, price: toPence(t.price * (1 - pct / 100)) / 100 },
  )
}

/** Percentage saving of a band against the first (single-lot) band, rounded. */
export function tierSavingPercent(tiers: readonly PriceTier[], tier: PriceTier): number {
  const base = sortTiers(tiers)[0]
  if (!base?.price || !tier.price || tier.quoteOnly) return 0
  return Math.max(0, Math.round((1 - tier.price / base.price) * 100))
}

/* ------------------------------------------------------------------ */
/* Lines & totals                                                      */
/* ------------------------------------------------------------------ */

export type LineInput = {
  tiers: readonly PriceTier[]
  qty: number
  /** Needed for unit = 'kg'. Weight of one lot/bale. */
  weightKg?: number | null
  /** Needed for unit = 'piece'. Pieces in one lot. */
  pieces?: number | null
}

export type LinePrice = {
  tier?: PriceTier
  /** Price of ONE lot in pence, or null when it must be quoted. */
  perLotPence: number | null
  /** Guide subtotal in pence, or null when it must be quoted. */
  subtotalPence: number | null
  quoteOnly: boolean
  savingPercent: number
}

const QUOTE_ONLY = (tier?: PriceTier): LinePrice => ({
  tier,
  perLotPence: null,
  subtotalPence: null,
  quoteOnly: true,
  savingPercent: 0,
})

/** Guide price for one basket line. */
export function priceLine({ tiers, qty, weightKg, pieces }: LineInput): LinePrice {
  const tier = findTier(tiers, qty)
  if (!tier || tier.quoteOnly || tier.price == null) return QUOTE_ONLY(tier)

  let multiplier: number
  if (tier.unit === 'lot') multiplier = 1
  else if (tier.unit === 'kg') multiplier = weightKg ?? NaN
  else multiplier = pieces ?? NaN

  if (!Number.isFinite(multiplier) || multiplier <= 0) return QUOTE_ONLY(tier)

  const perLotPence = toPence(tier.price * multiplier)
  return {
    tier,
    perLotPence,
    subtotalPence: perLotPence * qty,
    quoteOnly: false,
    savingPercent: tierSavingPercent(tiers, tier),
  }
}

export type BasketTotal = {
  /** Sum of all priced lines, in pence. */
  guideTotalPence: number
  /** True when at least one line needs a quote, so the total is partial. */
  hasQuoteOnlyLines: boolean
}

export function basketTotal(lines: readonly LinePrice[]): BasketTotal {
  return lines.reduce<BasketTotal>(
    (acc, line) => ({
      guideTotalPence: acc.guideTotalPence + (line.subtotalPence ?? 0),
      hasQuoteOnlyLines: acc.hasQuoteOnlyLines || line.quoteOnly,
    }),
    { guideTotalPence: 0, hasQuoteOnlyLines: false },
  )
}

/**
 * Builds the standard 4-band ladder from the spec (1 / 2–4 −5% / 5–9 −10% / 10+ quote).
 * Used by the CMS "generate default bands" helper and the seed.
 */
export function defaultTiers(basePrice: number, unit: PriceUnit = 'lot'): PriceTier[] {
  const at = (pct: number) => toPence(basePrice * (1 - pct / 100)) / 100
  return [
    { minQty: 1, maxQty: 1, price: basePrice, unit },
    { minQty: 2, maxQty: 4, price: at(5), unit },
    { minQty: 5, maxQty: 9, price: at(10), unit },
    { minQty: 10, maxQty: null, unit, quoteOnly: true },
  ]
}
