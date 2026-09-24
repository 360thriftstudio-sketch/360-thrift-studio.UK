'use client'

import { ShoppingBasket } from 'lucide-react'

import { basket, useBasket } from '@/lib/basket-store'
import { cn } from '@/lib/utils'

/** Basket icon with live count. Opens the drawer; the count bounces once on change. */
export function HeaderBasketLink({ className }: { className?: string }) {
  const { lines, hydrated } = useBasket()
  const count = lines.length
  return (
    <button
      type="button"
      onClick={() => basket.setDrawer(true)}
      aria-haspopup="dialog"
      className={cn('relative inline-flex size-11 items-center justify-center rounded-pill hover:bg-line/60', className)}
      data-basket-target
    >
      <ShoppingBasket aria-hidden className="size-5" />
      <span className="sr-only">{`Quote basket, ${count} ${count === 1 ? 'lot' : 'lots'}`}</span>
      <span
        key={count}
        aria-hidden
        className={cn(
          'absolute right-0 top-0.5 inline-flex min-w-5 items-center justify-center rounded-pill border-2 border-surface bg-brand-yellow px-1 text-xs font-bold text-ink',
          hydrated && count > 0 && 'motion-safe:animate-[count-bounce_400ms_var(--ease-brand)]',
        )}
      >
        {count}
      </span>
    </button>
  )
}
