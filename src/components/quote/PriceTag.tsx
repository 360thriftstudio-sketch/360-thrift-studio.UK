'use client'

import { Lock } from 'lucide-react'
import Link from 'next/link'

import { formatPence, priceLine, type PriceTier, type PriceVisibility } from '@/lib/pricing'

import { usePriceAccess } from './ViewerContext'

const UNIT: Record<string, string> = { lot: 'per lot', kg: 'per kg', piece: 'per piece' }

/** Compact guide price for cards: "£1,650 per lot", gated or on request. */
export function PriceTag({
  tiers,
  visibility,
  weightKg,
  pieces,
}: {
  tiers: PriceTier[]
  visibility: PriceVisibility
  weightKg?: number | null
  pieces?: number | null
}) {
  const access = usePriceAccess(visibility)
  if (access === 'on-request') return <p className="text-sm font-semibold">Price on request</p>
  if (access === 'gated') {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
        <Lock aria-hidden className="size-3.5" />
        <Link href="/trade-account" className="underline underline-offset-2 hover:no-underline">
          Trade price — open an account
        </Link>
      </p>
    )
  }
  const first = tiers.find((t) => t.minQty === 1) ?? tiers[0]
  if (!first || first.quoteOnly || first.price == null) return <p className="text-sm font-semibold">Quote only</p>
  const line = priceLine({ tiers, qty: 1, weightKg, pieces })
  return (
    <p className="leading-tight">
      <span className="font-display text-xl">£{first.price.toLocaleString('en-GB', { minimumFractionDigits: first.price % 1 ? 2 : 0 })}</span>{' '}
      <span className="text-sm text-ink-muted">{UNIT[first.unit]}</span>
      {first.unit !== 'lot' && line.perLotPence != null ? (
        <span className="block text-xs text-ink-muted">≈ {formatPence(line.perLotPence)} per lot</span>
      ) : null}
    </p>
  )
}
