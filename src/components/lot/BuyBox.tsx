'use client'

import { Heart, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

import { AddToQuoteButton } from '@/components/quote/AddToQuoteButton'
import { PriceTag } from '@/components/quote/PriceTag'
import { PriceTierTable } from '@/components/quote/PriceTierTable'
import { Button, QuantityStepper } from '@/components/ui'
import type { BasketLine } from '@/lib/basket-store'
import type { PriceTier, PriceVisibility } from '@/lib/pricing'

type Props = {
  line: Omit<BasketLine, 'qty'>
  tiers: PriceTier[]
  visibility: PriceVisibility
  weightKg?: number | null
  pieces?: number | null
  moq: number
  max: number
  sold: boolean
  whatsapp?: string | null
  url: string
}

/** Qty stepper + live tier table + actions. Also renders the sticky mobile bar. */
export function BuyBox({ line, tiers, visibility, weightKg, pieces, moq, max, sold, whatsapp, url }: Props) {
  const [qty, setQty] = useState(moq)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const key = 'thrift360.recent.v1'
      const prev = JSON.parse(localStorage.getItem(key) ?? '[]') as string[]
      localStorage.setItem(key, JSON.stringify([line.slug, ...prev.filter((s) => s !== line.slug)].slice(0, 12)))
      const s = JSON.parse(localStorage.getItem('thrift360.saved.v1') ?? '[]') as string[]
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after mount
      setSaved(s.includes(line.slug))
    } catch {
      // storage unavailable
    }
  }, [line.slug])

  const toggleSave = () => {
    try {
      const key = 'thrift360.saved.v1'
      const s = JSON.parse(localStorage.getItem(key) ?? '[]') as string[]
      const next = s.includes(line.slug) ? s.filter((x) => x !== line.slug) : [line.slug, ...s]
      localStorage.setItem(key, JSON.stringify(next))
      setSaved(next.includes(line.slug))
    } catch {
      setSaved((v) => !v)
    }
  }

  const waText = encodeURIComponent(`Hi 360 Thrift Studio, I'm interested in ${line.title} (SKU ${line.sku}) x${qty}: ${url}`)

  return (
    <>
      <div className="grid gap-4">
        <PriceTierTable tiers={tiers} visibility={visibility} qty={qty} weightKg={weightKg} pieces={pieces} />
        {!sold ? <QuantityStepper value={qty} onChange={setQty} min={moq} max={max} /> : null}
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <AddToQuoteButton line={line} qty={qty} soldOut={sold} size="lg" />
          {whatsapp ? (
            <Button asChild variant="secondary" size="lg" className="border-2 border-ink">
              <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${waText}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden className="size-5" /> WhatsApp this lot
              </a>
            </Button>
          ) : null}
          <Button variant="secondary" size="lg" className="border-2 border-ink" aria-pressed={saved} onClick={toggleSave}>
            <Heart aria-hidden className={saved ? 'size-5 fill-error text-error' : 'size-5'} />
            {saved ? 'Saved' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Sticky mobile bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t-2 border-ink bg-surface px-4 py-3 lg:hidden">
        <div className="min-w-0 flex-1">
          <PriceTag tiers={tiers} visibility={visibility} weightKg={weightKg} pieces={pieces} />
        </div>
        <AddToQuoteButton line={line} qty={qty} soldOut={sold} />
      </div>
    </>
  )
}
