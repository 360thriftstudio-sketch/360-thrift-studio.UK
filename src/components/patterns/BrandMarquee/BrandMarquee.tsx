'use client'

import { Pause, Play } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import type { NavBrand } from '@/lib/nav-types'

import { BrandLogo } from '../BrandLogo/BrandLogo'

/**
 * Scrolling brand strip (~40 px/s). Pauses on hover/focus and with the visible
 * pause button; static under reduced motion. Only the container moves — marks
 * are never animated or altered.
 */
export function BrandMarquee({ brands }: { brands: NavBrand[] }) {
  const [paused, setPaused] = useState(false)
  if (!brands.length) return null
  const duration = Math.max(20, brands.length * 4) // ≈ 40 px/s for ~160 px tiles
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-3 pr-3" aria-hidden={hidden || undefined}>
      {brands.map((b) => (
        <li key={b.href}>
          <Link
            href={b.href}
            tabIndex={hidden ? -1 : undefined}
            className="flex h-14 min-w-40 items-center justify-center rounded-md border-2 border-ink bg-surface px-5 hover:bg-brand-yellow"
          >
            <BrandLogo name={b.label} mode={b.mode} logoUrl={b.logoUrl} />
            <span className="sr-only"> — view lots</span>
          </Link>
        </li>
      ))}
    </ul>
  )
  return (
    <section aria-label="Brands we stock" className="border-y-2 border-ink bg-brand-yellow py-4">
      <div className="container-site mb-3 flex items-center justify-between gap-3">
        <p className="font-display text-xl uppercase">Pre-owned brands in stock</p>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-pill border-2 border-ink bg-surface px-3 text-sm font-semibold"
        >
          {paused ? <Play aria-hidden className="size-4" /> : <Pause aria-hidden className="size-4" />}
          {paused ? 'Play' : 'Pause'} brand scroll
        </button>
      </div>
      <div className="marquee group overflow-hidden" data-paused={paused || undefined}>
        <div className="marquee-track flex w-max" style={{ animationDuration: `${duration}s` }}>
          {row(false)}
          {row(true)}
        </div>
      </div>
    </section>
  )
}
