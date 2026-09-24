'use client'

import { Search, ShoppingBasket, User } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import type { SiteNav } from '@/lib/nav-types'
import { cn } from '@/lib/utils'

import { MegaMenu } from '../MegaMenu/MegaMenu'
import { MobileNav } from '../MobileNav/MobileNav'
import { StudioLogo } from '../StudioLogo/StudioLogo'

const iconLink =
  'relative inline-flex size-11 items-center justify-center rounded-pill hover:bg-line/60'

/**
 * Sticky header. Shrinks to 56 px once scrolled; hides on scroll down and
 * reappears on scroll up (never hides while focus is inside it).
 */
export function Header({ nav, basketCount = 0 }: { nav: SiteNav; basketCount?: number }) {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 8)
      const focusInside = ref.current?.contains(document.activeElement)
      const menuOpen = ref.current?.querySelector('[aria-expanded="true"]')
      setHidden(y > lastY.current && y > 240 && !focusInside && !menuOpen)
      lastY.current = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const basketLabel = `Quote basket, ${basketCount} ${basketCount === 1 ? 'lot' : 'lots'}`

  return (
    <header
      ref={ref}
      data-state={scrolled ? 'scrolled' : 'default'}
      onFocus={() => setHidden(false)}
      className={cn(
        'sticky top-0 z-30 border-b border-line bg-surface',
        'transition-transform duration-[var(--dur-base)] ease-out',
        hidden && '-translate-y-full',
      )}
    >
      <div
        className={cn(
          'container-site flex items-center gap-2 transition-[height] duration-[var(--dur-base)] ease-out',
          scrolled ? 'h-[var(--header-h-scrolled)]' : 'h-[var(--header-h)]',
        )}
      >
        <MobileNav nav={nav} />
        <Link href="/" className="mr-4 inline-flex min-h-11 items-center">
          <StudioLogo variant="header" />
          <span className="sr-only">— home</span>
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <MegaMenu nav={nav} />
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <form action="/search" role="search" className="hidden md:block">
            <label htmlFor="header-search" className="sr-only">
              Search lots, brands and sections
            </label>
            <div className="flex items-center gap-2 rounded-pill border border-line bg-bg px-3 focus-within:border-ink">
              <Search aria-hidden className="size-4 text-ink-muted" />
              <input
                id="header-search"
                name="q"
                type="search"
                placeholder="Search lots, brands…"
                className="min-h-10 w-40 bg-transparent text-sm outline-none xl:w-56"
              />
            </div>
          </form>
          <Link href="/search" className={cn(iconLink, 'md:hidden')}>
            <Search aria-hidden className="size-5" />
            <span className="sr-only">Search</span>
          </Link>
          <Link href="/account" className={iconLink}>
            <User aria-hidden className="size-5" />
            <span className="sr-only">Account</span>
          </Link>
          <Link href="/quote" className={iconLink} data-basket-target>
            <ShoppingBasket aria-hidden className="size-5" />
            <span className="sr-only">{basketLabel}</span>
            <span
              aria-hidden
              className="absolute right-0.5 top-0.5 inline-flex min-w-5 items-center justify-center rounded-pill bg-accent px-1 text-xs font-bold text-accent-ink"
            >
              {basketCount}
            </span>
          </Link>
        </div>
      </div>
    </header>
  )
}
