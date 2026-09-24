'use client'

import { Check, Plus } from 'lucide-react'
import { useState } from 'react'

import { Button, type ButtonProps } from '@/components/ui'
import { basket, useBasket, type BasketLine } from '@/lib/basket-store'

/** Primary action on every lot: "Add to quote". Opens the basket drawer. */
export function AddToQuoteButton({
  line,
  qty = 1,
  soldOut,
  ...props
}: { line: Omit<BasketLine, 'qty'>; qty?: number; soldOut?: boolean } & Omit<ButtonProps, 'onClick'>) {
  const { lines } = useBasket()
  const [pulse, setPulse] = useState(false)
  const inBasket = lines.some((l) => l.lotId === line.lotId)

  if (soldOut) {
    return (
      <Button variant="secondary" disabled {...props}>
        Sold
      </Button>
    )
  }
  return (
    <Button
      {...props}
      data-pulse={pulse || undefined}
      onClick={() => {
        basket.add({ ...line, qty })
        setPulse(true)
        setTimeout(() => setPulse(false), 600)
      }}
    >
      {inBasket ? <Check aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4" />}
      {inBasket ? 'Add again' : 'Add to quote'}
    </Button>
  )
}
