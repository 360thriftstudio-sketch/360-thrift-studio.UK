'use client'

import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'

import type { NavLink, SiteNav } from '@/lib/nav-types'
import { cn } from '@/lib/utils'

import { BrandLogo } from '../BrandLogo/BrandLogo'

type PanelKey = 'shop' | 'brands' | 'styles' | 'trade'

const OPEN_DELAY = 150 // hover intent
const CLOSE_DELAY = 120

/**
 * Desktop main menu (≥ lg). Disclosure pattern: each item is a button with
 * aria-expanded controlling its panel. Esc closes and returns focus;
 * clicking outside or tabbing away closes.
 */
export function MegaMenu({ nav }: { nav: SiteNav }) {
  const pathname = usePathname()
  // Panel + the path it opened on, so navigating closes it.
  const [state, setState] = useState<{ key: PanelKey; path: string } | null>(null)
  const open = state && state.path === pathname ? state.key : null
  const setOpen = useCallback(
    (key: PanelKey | null) => setState(key ? { key, path: pathname } : null),
    [pathname],
  )
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggers = useRef<Partial<Record<PanelKey, HTMLButtonElement | null>>>({})
  const baseId = useId()

  const clear = () => {
    if (timer.current) clearTimeout(timer.current)
  }
  const schedule = useCallback((next: PanelKey | null, delay: number) => {
    clear()
    timer.current = setTimeout(() => setOpen(next), delay)
  }, [setOpen])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        triggers.current[open]?.focus()
        setOpen(null)
      }
    }
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, setOpen])

  useEffect(() => clear, [])

  const panels: { key: PanelKey; label: string; content: ReactNode }[] = [
    { key: 'shop', label: 'Shop', content: <ShopPanel nav={nav} /> },
    { key: 'brands', label: 'Brands', content: <BrandsPanel nav={nav} /> },
    { key: 'styles', label: 'Styles', content: <StylesPanel styles={nav.styles} /> },
  ]
  const trade = { key: 'trade' as const, label: 'Trade', content: <LinkList links={nav.trade} /> }

  const renderItem = ({ key, label, content }: (typeof panels)[number]) => {
    const panelId = `${baseId}-${key}`
    const isOpen = open === key
    return (
      <li
        key={key}
        onPointerEnter={(e) => e.pointerType === 'mouse' && schedule(key, open ? 0 : OPEN_DELAY)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && schedule(null, CLOSE_DELAY)}
      >
        <button
          ref={(el) => {
            triggers.current[key] = el
          }}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => {
            clear()
            setOpen(isOpen ? null : key)
          }}
          className={cn(
            'inline-flex min-h-11 items-center gap-1 rounded-md px-3 font-semibold',
            'hover:bg-line/60 aria-expanded:bg-line/60',
          )}
        >
          {label}
          <ChevronDown
            aria-hidden
            className={cn(
              'size-4 transition-transform duration-[var(--dur-base)] ease-out',
              isOpen && 'rotate-180',
            )}
          />
        </button>
        <div
          id={panelId}
          hidden={!isOpen}
          data-state={isOpen ? 'open' : 'closed'}
          className="mega-panel absolute inset-x-0 top-full z-30 border-y border-line bg-surface shadow-pop"
        >
          <div className="container-site py-8">{content}</div>
        </div>
      </li>
    )
  }

  return (
    <div
      ref={rootRef}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setOpen(null)
      }}
    >
      <ul className="flex items-center gap-1">
        {panels.map(renderItem)}
        <li>
          <Link
            href={nav.catalogue.href}
            className="inline-flex min-h-11 items-center rounded-md px-3 font-semibold hover:bg-line/60"
          >
            {nav.catalogue.label}
          </Link>
        </li>
        {renderItem(trade)}
      </ul>
    </div>
  )
}

function LinkList({ links, className }: { links: NavLink[]; className?: string }) {
  return (
    <ul className={cn('grid gap-1', className)}>
      {links.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className="inline-flex min-h-8 items-center hover:text-accent hover:underline">
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function ColumnHeading({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-muted">{children}</p>
}

function ShopPanel({ nav }: { nav: SiteNav }) {
  return (
    <div className="grid grid-cols-4 gap-8">
      <div>
        <ColumnHeading>Tops, bottoms &amp; denim</ColumnHeading>
        <LinkList links={nav.shop.column1} />
      </div>
      <div>
        <ColumnHeading>Knitwear, outerwear &amp; more</ColumnHeading>
        <LinkList links={nav.shop.column2} />
      </div>
      <div>
        <ColumnHeading>Quick links</ColumnHeading>
        <LinkList links={[{ label: 'All lots', href: '/shop' }, ...nav.shop.quick]} />
      </div>
      {/* Featured image slot — filled from CMS FeaturedCollections in Build 2. */}
      <div
        aria-hidden
        className="aspect-[3/4] rounded-lg border border-dashed border-line bg-bg"
      />
    </div>
  )
}

function BrandsPanel({ nav }: { nav: SiteNav }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-8">
      <ul className="grid grid-cols-4 gap-2">
        {nav.brands.featured.map((b) => (
          <li key={b.href}>
            <Link
              href={b.href}
              className="flex min-h-14 items-center justify-center rounded-md border border-line bg-bg px-3 text-center hover:border-ink"
            >
              <BrandLogo name={b.label} mode={b.mode} logoUrl={b.logoUrl} className="text-sm" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="min-w-48">
        <ColumnHeading>More</ColumnHeading>
        <LinkList links={nav.brands.more} />
      </div>
    </div>
  )
}

function StylesPanel({ styles }: { styles: NavLink[] }) {
  return (
    <ul className="grid grid-cols-5 gap-3">
      {styles.map((s) => (
        <li key={s.href}>
          <Link
            href={s.href}
            className="flex min-h-20 items-end rounded-md border border-line bg-bg p-3 font-semibold hover:border-ink"
          >
            {/* Thumbnail image added when style tiles have photos. */}
            {s.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}
