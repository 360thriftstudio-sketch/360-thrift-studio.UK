'use client'

import { ChevronDown, Menu, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { Drawer } from '@/components/ui'
import type { NavLink, SiteNav } from '@/lib/nav-types'

/** Mobile/tablet menu (< lg): full-screen drawer, search pinned top, accordion levels. */
export function MobileNav({ nav }: { nav: SiteNav }) {
  const pathname = usePathname()
  // Remember where the menu was opened, so navigating closes it.
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const open = openedAt === pathname
  const setOpen = (next: boolean) => setOpenedAt(next ? pathname : null)

  const groups: { label: string; links: NavLink[] }[] = [
    {
      label: 'Shop',
      links: [{ label: 'All lots', href: '/shop' }, ...nav.shop.column1, ...nav.shop.column2, ...nav.shop.quick],
    },
    { label: 'Brands', links: [...nav.brands.featured, ...nav.brands.more] },
    { label: 'Styles', links: nav.styles },
    { label: 'Trade', links: nav.trade },
  ]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex size-11 items-center justify-center rounded-pill hover:bg-line/60 lg:hidden"
      >
        <Menu aria-hidden className="size-6" />
        <span className="sr-only">Open menu</span>
      </button>
      <Drawer open={open} onOpenChange={setOpen} title="Menu" side="left" size="full">
        <form action="/search" role="search" className="border-b border-line p-4">
          <label htmlFor="mobile-search" className="sr-only">
            Search lots, brands and sections
          </label>
          <div className="flex items-center gap-2 rounded-md border border-line bg-bg px-3">
            <Search aria-hidden className="size-5 text-ink-muted" />
            <input
              id="mobile-search"
              name="q"
              type="search"
              placeholder="Search lots, brands, sections"
              className="min-h-11 w-full bg-transparent outline-none"
            />
          </div>
        </form>
        <nav aria-label="Main">
          <ul>
            {groups.map((g) => (
              <li key={g.label} className="border-b border-line">
                <details className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 text-lg font-bold [&::-webkit-details-marker]:hidden">
                    {g.label}
                    <ChevronDown
                      aria-hidden
                      className="size-5 transition-transform duration-[var(--dur-base)] group-open:rotate-180"
                    />
                  </summary>
                  <ul className="pb-3">
                    {g.links.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className="flex min-h-11 items-center px-6 hover:bg-line/40">
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
            <li className="border-b border-line">
              <Link href={nav.catalogue.href} className="flex min-h-14 items-center px-4 text-lg font-bold">
                {nav.catalogue.label}
              </Link>
            </li>
          </ul>
        </nav>
      </Drawer>
    </>
  )
}
