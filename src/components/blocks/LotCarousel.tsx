import Link from 'next/link'

import { LotCard } from '@/components/catalogue/LotCard'
import type { LotSummary } from '@/lib/facets'

/** Horizontal scroll-snap row of LotCards (keyboard: Tab through cards). */
export function LotCarousel({ title, eyebrow, lots, href }: { title: string; eyebrow?: string; lots: LotSummary[]; href: string }) {
  if (!lots.length) return null
  return (
    <section aria-labelledby="carousel-h" className="py-16">
      <div className="container-site mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          {eyebrow ? <p className="font-marker text-lg text-brand-blue">{eyebrow}</p> : null}
          <h2 id="carousel-h" className="text-4xl md:text-5xl">{title}</h2>
        </div>
        <Link href={href} className="font-bold text-accent underline underline-offset-4">See all →</Link>
      </div>
      <ul className="container-site flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:thin]">
        {lots.map((lot) => (
          <li key={lot.id} className="w-[70vw] shrink-0 snap-start sm:w-[44vw] md:w-[30vw] lg:w-[22%]">
            <LotCard lot={lot} />
          </li>
        ))}
      </ul>
    </section>
  )
}
