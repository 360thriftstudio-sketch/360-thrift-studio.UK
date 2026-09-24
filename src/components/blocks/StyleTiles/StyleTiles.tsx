import Link from 'next/link'

import type { NavLink } from '@/lib/nav-types'

const BG = ['bg-brand-yellow', 'bg-surface', 'bg-brand-green', 'bg-surface'] as const

export function StyleTiles({ styles }: { styles: NavLink[] }) {
  return (
    <section aria-labelledby="styles-heading" className="container-site py-16">
      <p className="font-marker text-lg text-brand-blue">Curated by look</p>
      <h2 id="styles-heading" className="mb-6 text-4xl md:text-5xl">Shop by style</h2>
      <ul className="flex flex-wrap gap-3">
        {styles.map((s, i) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className={`inline-flex min-h-12 items-center rounded-pill border-2 border-ink px-5 font-display text-lg uppercase tracking-wide shadow-[3px_3px_0_0_var(--brand-black)] transition-transform hover:-translate-y-0.5 ${BG[i % 4]}`}
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
