'use client'

import { Lock } from 'lucide-react'
import Link from 'next/link'

import {
  findTier,
  formatPence,
  PRICE_FOOTNOTE,
  priceLine,
  sortTiers,
  tierSavingPercent,
  toPence,
  type PriceTier,
  type PriceVisibility,
} from '@/lib/pricing'
import { cn } from '@/lib/utils'

import { usePriceAccess } from './ViewerContext'

const UNIT: Record<string, string> = { lot: 'lot', kg: 'kg', piece: 'piece' }

const qtyLabel = (t: PriceTier) =>
  t.maxQty == null ? `${t.minQty}+` : t.maxQty === t.minQty ? `${t.minQty}` : `${t.minQty}–${t.maxQty}`

/** Tier table with the band for the current quantity highlighted and a live subtotal. */
export function PriceTierTable({
  tiers,
  visibility,
  qty,
  weightKg,
  pieces,
}: {
  tiers: PriceTier[]
  visibility: PriceVisibility
  qty: number
  weightKg?: number | null
  pieces?: number | null
}) {
  const access = usePriceAccess(visibility)

  if (access !== 'visible') {
    return (
      <div className="rounded-lg border border-line bg-bg p-4">
        {access === 'gated' ? (
          <p className="flex items-start gap-2 text-sm">
            <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              Trade prices are visible after a quick account check.{' '}
              <Link href="/trade-account" className="font-semibold text-accent underline underline-offset-2">
                Open a trade account
              </Link>
            </span>
          </p>
        ) : (
          <p className="text-sm">Price on request — add it to your quote basket and we’ll price it for you.</p>
        )}
      </div>
    )
  }

  const sorted = sortTiers(tiers)
  const active = findTier(sorted, qty)
  const line = priceLine({ tiers: sorted, qty, weightKg, pieces })

  return (
    <div className="grid gap-2">
      <table className="w-full overflow-hidden rounded-lg border border-line text-sm">
        <caption className="sr-only">Guide price by quantity</caption>
        <thead className="bg-bg text-left text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">Quantity (lots)</th>
            <th scope="col" className="px-3 py-2 font-semibold">Guide price per {UNIT[sorted[0]?.unit ?? 'lot']}</th>
            <th scope="col" className="px-3 py-2 font-semibold">Saving</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => {
            const isActive = t === active
            const saving = tierSavingPercent(sorted, t)
            return (
              <tr
                key={t.minQty}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'border-t border-line transition-colors duration-[160ms]',
                  isActive && 'bg-highlight font-bold text-highlight-ink',
                )}
              >
                <td className="px-3 py-2">{qtyLabel(t)}</td>
                <td className="px-3 py-2">
                  {t.quoteOnly || t.price == null ? 'Quote' : formatPence(toPence(t.price))}
                </td>
                <td className="px-3 py-2">{t.quoteOnly ? 'Best price' : saving ? `${saving}%` : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="flex flex-wrap items-baseline justify-between gap-2" aria-live="polite">
        <span className="text-sm text-ink-muted">
          {qty} {qty === 1 ? 'lot' : 'lots'} · guide subtotal
        </span>
        <span key={line.subtotalPence ?? 'quote'} className="font-display text-2xl motion-safe:animate-[fade-in_160ms_ease-out]">
          {line.subtotalPence == null ? 'We’ll quote this' : formatPence(line.subtotalPence)}
        </span>
      </p>
      <p className="text-xs text-ink-muted">{PRICE_FOOTNOTE}.</p>
    </div>
  )
}
