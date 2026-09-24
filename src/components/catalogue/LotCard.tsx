import Image from 'next/image'
import Link from 'next/link'

import { AddToQuoteButton } from '@/components/quote/AddToQuoteButton'
import { PriceTag } from '@/components/quote/PriceTag'
import type { LotSummary } from '@/lib/facets'
import { cn } from '@/lib/utils'

import { lotToLine, specsLine } from './lot-line'
import { LotPlaceholder } from './LotPlaceholder'
import { QuickViewButton } from './QuickView'
import { StockBadges } from './StockBadges'

/**
 * Grid card: 4:5 image (2nd image on hover), badges, brand, title,
 * pieces · kg · grade, guide price, Add to quote, Quick view.
 */
export function LotCard({ lot, priority }: { lot: LotSummary; priority?: boolean }) {
  const sold = lot.stock.status === 'sold'
  const brandLine =
    lot.brands.length === 1 ? lot.brands[0].name : lot.brands.length > 1 ? `${lot.brands.length} brands` : lot.section.name
  const [img1, img2] = lot.images

  return (
    <article
      data-state={sold ? 'sold' : 'default'}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-lg border-2 border-ink bg-surface',
        'transition-[transform,box-shadow] duration-[var(--dur-base)] ease-out',
        'hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--brand-black)] focus-within:shadow-[4px_4px_0_0_var(--brand-black)]',
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden border-b-2 border-ink bg-bg">
        {img1 ? (
          <>
            <Image
              src={img1.url}
              alt={img1.alt}
              fill
              priority={priority}
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw"
              className="object-cover"
            />
            {img2 ? (
              <Image
                src={img2.url}
                alt=""
                fill
                sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw"
                className="object-cover opacity-0 transition-opacity duration-[var(--dur-base)] group-hover:opacity-100"
              />
            ) : null}
          </>
        ) : (
          <LotPlaceholder label={lot.section.name} seed={lot.section.number} />
        )}
        {sold ? <div aria-hidden className="absolute inset-0 bg-bg/60" /> : null}
        <div className="absolute left-2 top-2">
          <StockBadges lot={lot} max={2} />
        </div>
        <div className="absolute inset-x-2 bottom-2 z-10 flex justify-end opacity-100 transition-opacity duration-[var(--dur-base)] md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <QuickViewButton lot={lot} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{brandLine}</p>
        <h3 className="font-body text-sm font-bold normal-case leading-snug tracking-normal">
          <Link href={`/lot/${lot.slug}`} className="after:absolute after:inset-0 after:content-[''] hover:underline">
            {lot.title}
          </Link>
        </h3>
        <p className="text-xs text-ink-muted">{specsLine(lot).join(' · ')}</p>
        <div className="mt-auto grid gap-2 pt-1">
          <PriceTag tiers={lot.priceTiers} visibility={lot.priceVisibility} weightKg={lot.weightKg} pieces={lot.pieces} />
          <AddToQuoteButton
            line={lotToLine(lot)}
            soldOut={sold}
            size="sm"
            className="relative z-10 w-full"
          />
        </div>
      </div>
    </article>
  )
}

export function LotCardSkeleton() {
  return (
    <div aria-hidden className="overflow-hidden rounded-lg border-2 border-line bg-surface">
      <div className="skeleton aspect-[4/5]" />
      <div className="grid gap-2 p-3">
        <div className="skeleton h-3 w-1/3 rounded-sm" />
        <div className="skeleton h-4 w-full rounded-sm" />
        <div className="skeleton h-3 w-2/3 rounded-sm" />
      </div>
    </div>
  )
}
