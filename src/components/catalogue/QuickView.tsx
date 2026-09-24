'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Eye, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import { AddToQuoteButton } from '@/components/quote/AddToQuoteButton'
import { PriceTierTable } from '@/components/quote/PriceTierTable'
import { QuantityStepper } from '@/components/ui'
import { GRADE_LABELS, LOT_TYPE_LABELS, type LotSummary } from '@/lib/facets'

import { lotToLine } from './lot-line'
import { LotPlaceholder } from './LotPlaceholder'
import { StockBadges } from './StockBadges'

/** Quick view dialog: gallery image, specs, tier table, qty, Add to quote. Focus trapped. */
export function QuickViewButton({ lot }: { lot: LotSummary }) {
  const [open, setOpen] = useState(false)
  const [qty, setQty] = useState(Math.max(1, lot.stock.moq ?? 1))
  const max = lot.stock.lotsAvailable > 0 ? lot.stock.lotsAvailable : 999

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="relative z-10 inline-flex min-h-9 items-center gap-1.5 rounded-pill border-2 border-ink bg-surface px-3 text-xs font-bold shadow-card hover:bg-brand-yellow">
        <Eye aria-hidden className="size-4" /> Quick view<span className="sr-only">: {lot.title}</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay fixed inset-0 z-40 bg-ink/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="quickview fixed left-1/2 top-1/2 z-50 grid max-h-[92dvh] w-[min(960px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border-2 border-ink bg-surface shadow-pop md:grid-cols-2"
        >
          <div className="relative aspect-[4/5] border-b-2 border-ink bg-bg md:border-b-0 md:border-r-2">
            {lot.images[0] ? (
              <Image src={lot.images[0].url} alt={lot.images[0].alt} fill sizes="(min-width: 768px) 480px, 94vw" className="object-cover" />
            ) : (
              <LotPlaceholder label={lot.section.name} seed={lot.section.number} />
            )}
          </div>
          <div className="grid content-start gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <StockBadges lot={lot} />
              <Dialog.Close className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-pill hover:bg-line/60">
                <X aria-hidden className="size-5" />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            </div>
            <Dialog.Title className="font-display text-2xl uppercase leading-tight">{lot.title}</Dialog.Title>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {lot.pieces ? (<><dt className="text-ink-muted">Pieces</dt><dd className="font-semibold">{lot.pieces}</dd></>) : null}
              {lot.weightKg ? (<><dt className="text-ink-muted">Weight</dt><dd className="font-semibold">{lot.weightKg} kg</dd></>) : null}
              <dt className="text-ink-muted">Grade</dt><dd className="font-semibold">{GRADE_LABELS[lot.grade]}</dd>
              <dt className="text-ink-muted">Lot type</dt><dd className="font-semibold">{LOT_TYPE_LABELS[lot.lotType]}</dd>
              <dt className="text-ink-muted">SKU</dt><dd className="font-semibold">{lot.sku}</dd>
            </dl>
            <PriceTierTable tiers={lot.priceTiers} visibility={lot.priceVisibility} qty={qty} weightKg={lot.weightKg} pieces={lot.pieces} />
            <div className="flex flex-wrap items-end gap-3">
              <QuantityStepper value={qty} onChange={setQty} min={Math.max(1, lot.stock.moq ?? 1)} max={max} />
              <AddToQuoteButton line={lotToLine(lot)} qty={qty} soldOut={lot.stock.status === 'sold'} className="flex-1" />
            </div>
            <Link href={`/lot/${lot.slug}`} className="text-sm font-semibold text-accent underline underline-offset-2">
              See full lot details
            </Link>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
