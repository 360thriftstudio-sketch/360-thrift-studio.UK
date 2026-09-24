import Image from 'next/image'
import Link from 'next/link'

export type SectionTile = {
  number: number
  name: string
  href: string
  image?: { url: string; alt: string } | null
  count?: number
}

/** 15 sections: 5×3 on desktop, 2 columns on mobile. Tiles are 3:4. */
export function SectionTiles({ sections }: { sections: SectionTile[] }) {
  return (
    <section aria-labelledby="sections-heading" className="container-site py-16">
      <h2 id="sections-heading" className="mb-6 text-2xl">
        Shop by section
      </h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {sections.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-lg border border-line bg-surface p-4 shadow-card transition-shadow duration-[var(--dur-base)] hover:shadow-pop"
            >
              {s.image ? (
                <Image
                  src={s.image.url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw"
                  className="object-cover"
                />
              ) : null}
              <span className="relative text-xs font-bold text-ink-muted">
                {String(s.number).padStart(2, '0')}
              </span>
              <span className="relative font-display text-lg font-extrabold leading-tight">{s.name}</span>
              {s.count != null ? (
                <span className="relative text-sm text-ink-muted">{s.count} lots</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
