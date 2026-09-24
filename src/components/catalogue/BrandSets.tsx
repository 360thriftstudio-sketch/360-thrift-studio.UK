import Link from 'next/link'

import type { Brand, FashionCategory, Section } from '@/payload-types'

/** "Fashion categories & relevant brands" block from the catalogue, per section. */
export function BrandSets({ section, counts }: { section: Section; counts: Map<string, number> }) {
  const sets = section.brandSets ?? []
  if (!sets.length) return null
  return (
    <section aria-labelledby="brand-sets" className="container-site py-10">
      <h2 id="brand-sets" className="mb-1 text-3xl">
        Brands we stock in {section.name}
      </h2>
      <p className="mb-6 text-sm text-ink-muted">Grouped by fashion category, as in our catalogue.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sets.map((set) => {
          const style = typeof set.fashionCategory === 'object' ? (set.fashionCategory as FashionCategory) : null
          const brands = (set.brands ?? []).filter((b): b is Brand => typeof b === 'object')
          return (
            <div key={set.id ?? set.label} className="rounded-lg border-2 border-ink bg-surface p-4">
              <h3 className="mb-3 font-body text-sm font-bold normal-case tracking-normal">
                {style ? (
                  <Link href={`/styles/${style.slug}`} className="hover:underline">
                    {set.label || style.name}
                  </Link>
                ) : (
                  set.label
                )}
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {brands.map((b) => {
                  const n = counts.get(b.slug) ?? 0
                  return (
                    <li key={b.id}>
                      <Link
                        href={`/brands/${b.slug}`}
                        className="inline-flex min-h-8 items-center gap-1 rounded-pill border border-line bg-bg px-2.5 text-sm hover:border-ink"
                      >
                        {b.name}
                        {n ? <span className="text-xs text-ink-muted">{n}</span> : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
