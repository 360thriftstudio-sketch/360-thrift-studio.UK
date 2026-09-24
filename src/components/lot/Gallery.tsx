'use client'

import { ChevronLeft, ChevronRight, Expand } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState, type KeyboardEvent, type TouchEvent } from 'react'

import { LotPlaceholder } from '@/components/catalogue/LotPlaceholder'
import { cn } from '@/lib/utils'

/** Main image + thumbs. Arrow keys, swipe, click-to-zoom (fullscreen). */
export function Gallery({ images, label, seed }: { images: { url: string; alt: string }[]; label: string; seed: number }) {
  const [i, setI] = useState(0)
  const [zoom, setZoom] = useState(false)
  const touchX = useRef<number | null>(null)
  const n = images.length
  const go = (d: number) => n && setI((x) => (x + d + n) % n)

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(1)
    if (e.key === 'ArrowLeft') go(-1)
    if (e.key === 'Escape') setZoom(false)
  }
  const onTouchEnd = (e: TouchEvent) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
    touchX.current = null
  }

  if (!n) {
    return (
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg border-2 border-ink">
        <LotPlaceholder label={label} seed={seed} />
      </div>
    )
  }

  return (
    <div className="grid gap-3" role="region" aria-roledescription="gallery" aria-label={`${label} photos`} onKeyDown={onKey}>
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border-2 border-ink bg-bg',
          zoom ? 'fixed inset-0 z-50 rounded-none border-0 bg-ink' : 'aspect-[4/5]',
        )}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={onTouchEnd}
      >
        <Image
          src={images[i].url}
          alt={images[i].alt}
          fill
          priority
          sizes={zoom ? '100vw' : '(min-width: 1024px) 55vw, 100vw'}
          className={zoom ? 'object-contain' : 'object-cover'}
        />
        <button
          type="button"
          onClick={() => setZoom((z) => !z)}
          className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-pill border-2 border-ink bg-surface"
        >
          <Expand aria-hidden className="size-5" />
          <span className="sr-only">{zoom ? 'Close full screen' : 'View full screen'}</span>
        </button>
        {n > 1 ? (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute left-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-pill border-2 border-ink bg-surface">
              <ChevronLeft aria-hidden className="size-5" />
              <span className="sr-only">Previous photo</span>
            </button>
            <button type="button" onClick={() => go(1)} className="absolute right-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-pill border-2 border-ink bg-surface">
              <ChevronRight aria-hidden className="size-5" />
              <span className="sr-only">Next photo</span>
            </button>
          </>
        ) : null}
        <p className="sr-only" aria-live="polite">{`Photo ${i + 1} of ${n}`}</p>
      </div>
      {n > 1 ? (
        <ul className="flex gap-2 overflow-x-auto">
          {images.map((img, idx) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setI(idx)}
                aria-current={idx === i ? 'true' : undefined}
                className="relative block aspect-[4/5] w-16 overflow-hidden rounded-md border-2 border-line aria-[current=true]:border-ink"
              >
                <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
                <span className="sr-only">Show photo {idx + 1}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
