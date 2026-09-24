'use client'

import { Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { Crown } from '@/components/brand/Graphics'
import { Button, Drawer, QuantityStepper } from '@/components/ui'
import { basket, useBasket } from '@/lib/basket-store'
import { basketTotal, formatPence, priceAccess, priceLine } from '@/lib/pricing'

import { useViewer } from './ViewerContext'

/** Opens on "Add to quote". Lists lines with qty steppers and the guide total. */
export function QuoteBasketDrawer() {
  const { lines, drawerOpen, announcement } = useBasket()
  const viewer = useViewer()

  const priced = lines.map((l) => {
    const visible = priceAccess(l.priceVisibility, viewer, viewer.requireLoginForPrices) === 'visible'
    return { line: l, price: visible ? priceLine({ tiers: l.tiers, qty: l.qty, weightKg: l.weightKg, pieces: l.pieces }) : null }
  })
  const total = basketTotal(priced.map((p) => p.price ?? { tier: undefined, perLotPence: null, subtotalPence: null, quoteOnly: true, savingPercent: 0 }))

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      <Drawer
        open={drawerOpen}
        onOpenChange={(o) => basket.setDrawer(o)}
        title={`Your quote basket (${lines.length} ${lines.length === 1 ? 'lot' : 'lots'})`}
        footer={
          lines.length ? (
            <div className="grid gap-3">
              <p className="flex items-baseline justify-between">
                <span className="text-sm">Guide total, excl. VAT &amp; shipping</span>
                <span className="font-display text-2xl">{formatPence(total.guideTotalPence)}</span>
              </p>
              {total.hasQuoteOnlyLines ? (
                <p className="text-xs text-ink-muted">Some lots are priced on your quote, so the total is partial.</p>
              ) : null}
              <Button asChild size="lg" onClick={() => basket.setDrawer(false)}>
                <Link href="/quote">Request my quote</Link>
              </Button>
              <p className="text-center text-xs text-ink-muted">No payment needed. We reply within 1 working day.</p>
            </div>
          ) : null
        }
      >
        {lines.length === 0 ? (
          <div className="grid justify-items-center gap-3 p-8 text-center">
            <Crown className="w-14" />
            <p className="font-semibold">Your basket is empty.</p>
            <p className="text-sm text-ink-muted">Add lots to build a quote — no payment needed.</p>
            <Button asChild variant="secondary" onClick={() => basket.setDrawer(false)}>
              <Link href="/shop">Browse the catalogue</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {priced.map(({ line, price }) => (
              <li key={line.lotId} className="grid grid-cols-[64px_1fr] gap-3 p-4">
                <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-bg">
                  {line.image ? <Image src={line.image} alt="" fill sizes="64px" className="object-cover" /> : <LotPlaceholderMini />}
                </div>
                <div className="grid gap-2">
                  <Link href={`/lot/${line.slug}`} className="text-sm font-semibold leading-snug hover:underline" onClick={() => basket.setDrawer(false)}>
                    {line.title}
                  </Link>
                  <p className="text-xs text-ink-muted">SKU {line.sku}</p>
                  <div className="flex items-end justify-between gap-2">
                    <QuantityStepper
                      size="sm"
                      label={`Quantity for ${line.title}`}
                      hideLabel
                      value={line.qty}
                      min={Math.max(1, line.moq ?? 1)}
                      max={line.maxQty && line.maxQty > 0 ? line.maxQty : 999}
                      onChange={(q) => basket.setQty(line.lotId, q)}
                    />
                    <p className="text-right text-sm font-bold">
                      {price?.subtotalPence != null ? formatPence(price.subtotalPence) : 'Quote'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => basket.remove(line.lotId)}
                    className="inline-flex w-fit items-center gap-1 text-xs text-ink-muted underline-offset-2 hover:text-error hover:underline"
                  >
                    <Trash2 aria-hidden className="size-3.5" /> Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    </>
  )
}

function LotPlaceholderMini() {
  return <div aria-hidden className="bg-splatter absolute inset-0 opacity-60" />
}
