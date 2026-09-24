import Link from 'next/link'

import { Crown, Splatter } from '@/components/brand/Graphics'

export type FeaturedCollection = { name: string; href: string; tier?: string | null; brand: string; description?: string | null; count: number }

const TONES = ['yellow', 'blue', 'green', 'yellow'] as const

export function FeaturedCollections({ items }: { items: FeaturedCollection[] }) {
  if (!items.length) return null
  return (
    <section aria-labelledby="featured" className="container-site py-16">
      <p className="font-marker text-lg text-brand-blue">Dedicated assortments</p>
      <h2 id="featured" className="mb-6 text-4xl md:text-5xl">Featured collections</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((c, i) => (
          <li key={c.href}>
            <Link href={c.href} className="group relative flex h-full min-h-72 flex-col justify-end gap-2 overflow-hidden rounded-lg border-2 border-ink bg-surface p-5 transition-shadow hover:shadow-[6px_6px_0_0_var(--brand-black)]">
              <Splatter tone={TONES[i]} className="absolute -right-12 -top-12 w-60 transition-transform duration-[var(--dur-slow)] group-hover:rotate-6" />
              <Crown className="absolute left-5 top-5 w-10" />
              <span className="relative w-fit rounded-sm bg-ink px-2 py-0.5 text-xs font-bold uppercase text-bg">{c.brand}{c.tier ? ` · ${c.tier}` : ''}</span>
              <span className="relative font-display text-2xl uppercase leading-tight">{c.name}</span>
              {c.description ? <span className="relative line-clamp-2 text-sm text-ink-muted">{c.description}</span> : null}
              <span className="relative text-sm font-bold text-accent">{c.count} lots →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
