import Link from 'next/link'

import type { NavLink } from '@/lib/nav-types'

export function StyleTiles({ styles }: { styles: NavLink[] }) {
  return (
    <section aria-labelledby="styles-heading" className="container-site py-16">
      <h2 id="styles-heading" className="mb-6 text-2xl">
        Shop by style
      </h2>
      <ul className="flex flex-wrap gap-2">
        {styles.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="inline-flex min-h-11 items-center rounded-pill border border-line bg-surface px-4 font-semibold hover:border-ink"
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
