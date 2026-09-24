import type { BasketLine } from '@/lib/basket-store'
import type { LotSummary } from '@/lib/facets'

/** Basket snapshot of a lot. */
export const lotToLine = (lot: LotSummary): Omit<BasketLine, 'qty'> => ({
  lotId: lot.id,
  slug: lot.slug,
  title: lot.title,
  sku: lot.sku,
  image: lot.images[0]?.url,
  tiers: lot.priceTiers,
  priceVisibility: lot.priceVisibility,
  weightKg: lot.weightKg,
  pieces: lot.pieces,
  maxQty: lot.stock.lotsAvailable,
  moq: lot.stock.moq,
})

export const specsLine = (lot: LotSummary): string[] =>
  [
    lot.pieces ? `${lot.pieces} pcs` : null,
    lot.weightKg ? `${lot.weightKg} kg` : null,
    lot.grade === 'mixed' ? 'Mixed grade' : lot.grade === 'cream' ? 'Cream grade' : `Grade ${lot.grade.toUpperCase()}`,
  ].filter((x): x is string => !!x)
