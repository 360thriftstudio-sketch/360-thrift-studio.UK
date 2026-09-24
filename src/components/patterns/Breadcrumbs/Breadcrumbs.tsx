import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

import type { NavLink } from '@/lib/nav-types'
import { jsonLdString } from '@/lib/seo'

/**
 * Full trail on desktop, "← Parent" on mobile. Emits BreadcrumbList JSON-LD.
 * `items` excludes Home (added automatically); the last item is the current page.
 */
export function Breadcrumbs({ items, baseUrl = '' }: { items: NavLink[]; baseUrl?: string }) {
  const trail: NavLink[] = [{ label: 'Home', href: '/' }, ...items]
  const parent = trail[trail.length - 2]
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: `${baseUrl}${item.href}`,
    })),
  }

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
      {parent ? (
        <Link href={parent.href} className="inline-flex min-h-6 items-center gap-1 hover:text-ink md:hidden">
          <ChevronLeft aria-hidden className="size-4" />
          {parent.label}
        </Link>
      ) : null}
      <ol className="hidden flex-wrap items-center gap-1.5 md:flex">
        {trail.map((item, i) => {
          const last = i === trail.length - 1
          return (
            <li key={item.href} className="inline-flex items-center gap-1.5">
              {last ? (
                <span aria-current="page" className="text-ink">
                  {item.label}
                </span>
              ) : (
                <>
                  <Link href={item.href} className="hover:text-ink hover:underline">
                    {item.label}
                  </Link>
                  <span aria-hidden>/</span>
                </>
              )}
            </li>
          )
        })}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
    </nav>
  )
}
