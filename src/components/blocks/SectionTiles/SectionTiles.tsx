import Image from 'next/image'
import Link from 'next/link'

import { Splatter } from '@/components/brand/Graphics'
import { Reveal } from '@/components/patterns/Reveal/Reveal'

export type SectionTile = {
  number: number
  name: string
  href: string
  image?: { url: string; alt: string } | null
  count?: number
}

const TONES = ['yellow', 'blue', 'green'] as const

/** 15 sections: 5×3 desktop, 2 columns mobile. 3:4 tiles. */
export function SectionTiles({ sections }: { sections: SectionTile[] }) {
  return (
    <section aria-labelledby="sections-heading" className="container-site py-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-marker text-lg text-brand-blue">15 sections</p>
          <h2 id="sections-heading" className="text-4xl md:text-5xl">Shop by section</h2>
        </div>
        <Link href="/shop" className="font-bold text-accent underline underline-offset-4">All lots →</Link>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        {sections.map((s, i) => (
          <li key={s.href}>
            <Reveal delay={i % 6}>
              <Link
                href={s.href}
                className="group relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-lg border-2 border-ink bg-surface p-4 transition-[transform,box-shadow] duration-[var(--dur-base)] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_var(--brand-black)]"
              >
                {s.image ? (
                  <Image src={s.image.url} alt="" fill sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw" className="object-cover" />
                ) : (
                  <Splatter tone={TONES[i % 3]} className="absolute -right-10 -top-10 w-48 transition-transform duration-[var(--dur-slow)] group-hover:rotate-12 group-hover:scale-110" />
                )}
                <span className="relative font-display text-6xl leading-none text-ink">{String(s.number).padStart(2, '0')}</span>
                <span className="relative grid gap-1">
                  <span className="font-display text-xl uppercase leading-tight md:text-2xl">{s.name}</span>
                  {s.count != null ? (
                    <span className="w-fit rounded-pill bg-ink px-2 py-0.5 text-xs font-bold text-bg">{s.count} lots</span>
                  ) : null}
                </span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  )
}
