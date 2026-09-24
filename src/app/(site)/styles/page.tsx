import type { Metadata } from 'next'
import Link from 'next/link'

import { Arrow, Splatter } from '@/components/brand/Graphics'
import { Breadcrumbs } from '@/components/patterns'
import { getLotCounts, getPayloadClient } from '@/lib/catalogue'

export const metadata: Metadata = { title: 'Shop by style', description: 'Ten fashion categories, from Classic & Preppy to Y2K & Vintage.' }

const TONES = ['yellow', 'blue', 'green'] as const

export default async function StylesIndex() {
  const payload = await getPayloadClient()
  const [styles, counts] = await Promise.all([
    payload.find({ collection: 'fashion-categories', sort: 'order', limit: 20, depth: 0 }),
    getLotCounts(),
  ])
  return (
    <div className="container-site grid gap-6 py-6">
      <Breadcrumbs items={[{ label: 'Styles', href: '/styles' }]} />
      <h1 className="text-5xl">Shop by style</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {styles.docs.map((s, i) => (
          <li key={s.id}>
            <Link
              href={`/styles/${s.slug}`}
              className="group relative flex min-h-48 flex-col justify-end overflow-hidden rounded-lg border-2 border-ink bg-surface p-5 transition-shadow hover:shadow-[6px_6px_0_0_var(--brand-black)]"
            >
              <Splatter tone={TONES[i % 3]} className="absolute -right-8 -top-8 w-48 opacity-90 transition-transform duration-[var(--dur-slow)] group-hover:rotate-6" />
              <span className="relative font-display text-3xl uppercase leading-none">{s.name}</span>
              <span className="relative mt-2 text-sm text-ink-muted">{s.description}</span>
              <span className="relative mt-3 inline-flex items-center gap-2 text-sm font-bold">
                {counts.byStyle.get(s.slug) ?? 0} lots <Arrow className="w-8" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
