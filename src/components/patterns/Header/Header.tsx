'use client'

import { Search, User } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { HeaderBasketLink } from '@/components/quote/HeaderBasketLink'
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
export function Header({ nav, loggedIn }: { nav: SiteNav; loggedIn?: boolean }) {
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

  return (
    <header
      ref={ref}
      data-state={scrolled ? 'scrolled' : 'default'}
      onFocus={() => setHidden(false)}
      className={cn(
        'sticky top-0 z-30 border-b-2 border-ink bg-brand-cream',
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
        <Link href="/" className="mr-2 inline-flex min-h-11 items-center lg:mr-4" aria-label="360° Thrift Studio — home">
          <StudioLogo variant="header" priority className={scrolled ? 'max-h-[48px] w-auto!' : undefined} />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <MegaMenu nav={nav} />
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <form action="/search" role="search" className="hidden md:block">
            <label htmlFor="header-search" className="sr-only">
              Search lots, brands and sections
            </label>
            <div className="flex items-center gap-2 rounded-pill border-2 border-ink bg-surface px-3">
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
            {loggedIn ? <span aria-hidden className="absolute right-2 top-2 size-2 rounded-pill bg-brand-green ring-2 ring-brand-cream" /> : null}
            <span className="sr-only">{loggedIn ? 'Your account' : 'Log in or create an account'}</span>
          </Link>
          <HeaderBasketLink />
        </div>
      </div>
    </header>
  )
}
