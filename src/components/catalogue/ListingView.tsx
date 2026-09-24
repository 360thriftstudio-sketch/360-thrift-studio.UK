import Link from 'next/link'
import type { ReactNode } from 'react'

import { Sparkle, Stroke } from '@/components/brand/Graphics'
import { Breadcrumbs } from '@/components/patterns'
import type { NavLink } from '@/lib/nav-types'
import { PAGE_SIZE, runListing, type FacetKey, type ListingState, type LotSummary } from '@/lib/facets'

import { EmptyState } from './EmptyState'
import { FilterPanel } from './FilterPanel'
import { ListingResults, ListingShell } from './ListingShell'
import { ListingToolbar } from './ListingToolbar'
import { LoadMore } from './LoadMore'
import { LotGrid } from './LotGrid'

export type Chip = { label: string; href: string; count?: number; selected?: boolean }

/**
 * One listing engine for every catalogue page. Sections, subcategories,
 * brands, collections, styles and search are preset scopes.
 */
export function ListingView({
  lots,
  state,
  title,
  eyebrow,
  intro,
  breadcrumbs,
  chips,
  hide = [],
  aside,
  seoContent,
  emptyHref = '/shop',
  emptyLabel = 'See all lots',
}: {
  lots: LotSummary[]
  state: ListingState
  title: string
  eyebrow?: string
  intro?: string | null
  breadcrumbs: NavLink[]
  chips?: Chip[]
  hide?: FacetKey[]
  aside?: ReactNode
  seoContent?: ReactNode
  emptyHref?: string
  emptyLabel?: string
}) {
  const result = runListing(lots, state, hide)
  const firstFilter = result.facets.flatMap((f) => f.options.filter((o) => o.selected).map((o) => `${f.label}: ${o.label}`))[0]

  return (
    <ListingShell state={state}>
      <div className="container-site grid gap-6 pb-8 pt-4">
        <Breadcrumbs items={breadcrumbs} />
        <header className="relative grid gap-3">
          {eyebrow ? <p className="font-marker text-lg text-brand-blue">{eyebrow}</p> : null}
          <h1 className="text-4xl md:text-5xl">{title}</h1>
          <Stroke className="-mt-1 h-3 w-40 text-brand-green" />
          {intro ? <p className="max-w-2xl text-ink-muted">{intro}</p> : null}
          <Sparkle tone="yellow" className="absolute right-2 top-0 hidden w-8 md:block" />
          {chips?.length ? (
            <nav aria-label="Subcategories" className="-mx-1 overflow-x-auto pb-1">
              <ul className="flex w-max gap-2 px-1 md:w-auto md:flex-wrap">
                {chips.map((c) => (
                  <li key={c.href}>
                    <Link
                      href={c.href}
                      aria-current={c.selected ? 'page' : undefined}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-pill border-2 border-ink bg-surface px-3 text-sm font-semibold hover:bg-brand-yellow aria-[current=page]:bg-ink aria-[current=page]:text-bg"
                    >
                      {c.label}
                      {c.count != null ? <span className="text-xs opacity-70">{c.count}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </header>
        {aside}

        <div className="grid gap-6 lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr]">
          <FilterPanel facets={result.facets} total={result.total} />
          <section aria-label="Results" className="grid content-start gap-4">
            <ListingToolbar facets={result.facets} total={result.total} />
            <ListingResults>
              {result.total === 0 ? (
                <EmptyState title="No lots match" action={{ label: emptyLabel, href: emptyHref }}>
                  {firstFilter ? (
                    <p>No lots match those filters. Try removing “{firstFilter}”.</p>
                  ) : (
                    <p>New lots land every week — check back soon or ask us to source it.</p>
                  )}
                </EmptyState>
              ) : (
                <LotGrid lots={result.lots} />
              )}
            </ListingResults>
            <LoadMore shown={result.shown} total={result.total} pageSize={PAGE_SIZE} />
          </section>
        </div>
        {seoContent ? (
          <details className="rounded-lg border border-line bg-surface p-4">
            <summary className="cursor-pointer font-semibold">About these lots</summary>
            <div className="mt-3 max-w-3xl text-sm text-ink-muted">{seoContent}</div>
          </details>
        ) : null}
      </div>
    </ListingShell>
  )
}
